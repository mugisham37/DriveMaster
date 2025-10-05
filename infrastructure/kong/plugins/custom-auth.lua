-- Custom Authentication Plugin for Adaptive Learning Platform
-- Extends JWT validation with additional security features

local jwt_decoder = require "resty.jwt"
local redis = require "resty.redis"

local CustomAuthHandler = {}

CustomAuthHandler.PRIORITY = 1000
CustomAuthHandler.VERSION = "1.0.0"

local function get_redis_connection()
    local red = redis:new()
    red:set_timeout(1000) -- 1 second
    
    local ok, err = red:connect("redis-cluster", 6379)
    if not ok then
        kong.log.err("Failed to connect to Redis: ", err)
        return nil
    end
    
    return red
end

local function validate_token_blacklist(jti)
    local red = get_redis_connection()
    if not red then
        return false -- Fail open if Redis is unavailable
    end
    
    local blacklisted, err = red:get("blacklist:token:" .. jti)
    if err then
        kong.log.err("Redis error checking blacklist: ", err)
        return false
    end
    
    red:set_keepalive(10000, 100)
    return blacklisted ~= ngx.null
end

local function check_user_status(user_id)
    local red = get_redis_connection()
    if not red then
        return true -- Fail open if Redis is unavailable
    end
    
    local user_active, err = red:get("user:active:" .. user_id)
    if err then
        kong.log.err("Redis error checking user status: ", err)
        return true
    end
    
    red:set_keepalive(10000, 100)
    return user_active ~= "false"
end

local function log_authentication_event(user_id, success, reason)
    local red = get_redis_connection()
    if not red then
        return
    end
    
    local event = {
        user_id = user_id,
        timestamp = ngx.time(),
        success = success,
        reason = reason or "",
        ip = kong.client.get_ip(),
        user_agent = kong.request.get_header("User-Agent") or ""
    }
    
    local event_json = require("cjson").encode(event)
    red:lpush("auth:events", event_json)
    red:expire("auth:events", 86400) -- Keep for 24 hours
    
    red:set_keepalive(10000, 100)
end

function CustomAuthHandler:access(conf)
    -- Get Authorization header
    local authorization_header = kong.request.get_header("Authorization")
    
    if not authorization_header then
        log_authentication_event(nil, false, "missing_authorization_header")
        return kong.response.exit(401, {
            error = "Unauthorized",
            message = "Authorization header is required"
        })
    end
    
    -- Extract JWT token
    local token = authorization_header:match("Bearer%s+(.+)")
    if not token then
        log_authentication_event(nil, false, "invalid_authorization_format")
        return kong.response.exit(401, {
            error = "Unauthorized", 
            message = "Invalid authorization header format"
        })
    end
    
    -- Decode and verify JWT
    local jwt_obj = jwt_decoder:verify(conf.secret, token)
    if not jwt_obj or not jwt_obj.valid then
        log_authentication_event(nil, false, "invalid_jwt_token")
        return kong.response.exit(401, {
            error = "Unauthorized",
            message = "Invalid or expired token"
        })
    end
    
    local payload = jwt_obj.payload
    
    -- Validate required claims
    if not payload.sub or not payload.exp or not payload.iat then
        log_authentication_event(payload.sub, false, "missing_required_claims")
        return kong.response.exit(401, {
            error = "Unauthorized",
            message = "Token missing required claims"
        })
    end
    
    -- Check token expiration with clock skew tolerance
    local current_time = ngx.time()
    local clock_skew = 300 -- 5 minutes tolerance
    
    if payload.exp < (current_time - clock_skew) then
        log_authentication_event(payload.sub, false, "token_expired")
        return kong.response.exit(401, {
            error = "Unauthorized",
            message = "Token has expired"
        })
    end
    
    -- Check if token is blacklisted
    if payload.jti and validate_token_blacklist(payload.jti) then
        log_authentication_event(payload.sub, false, "token_blacklisted")
        return kong.response.exit(401, {
            error = "Unauthorized",
            message = "Token has been revoked"
        })
    end
    
    -- Check user account status
    if not check_user_status(payload.sub) then
        log_authentication_event(payload.sub, false, "user_account_inactive")
        return kong.response.exit(403, {
            error = "Forbidden",
            message = "User account is inactive"
        })
    end
    
    -- Set user context for downstream services
    kong.service.request.set_header("X-User-ID", payload.sub)
    kong.service.request.set_header("X-User-Email", payload.email or "")
    kong.service.request.set_header("X-User-Roles", table.concat(payload.roles or {}, ","))
    kong.service.request.set_header("X-Token-JTI", payload.jti or "")
    
    -- Log successful authentication
    log_authentication_event(payload.sub, true, "authentication_successful")
    
    -- Update user last active timestamp
    local red = get_redis_connection()
    if red then
        red:set("user:last_active:" .. payload.sub, current_time)
        red:expire("user:last_active:" .. payload.sub, 86400)
        red:set_keepalive(10000, 100)
    end
end

return CustomAuthHandler