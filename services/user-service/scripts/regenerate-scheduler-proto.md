# Regenerating SchedulerStateService Protobuf Files

The SchedulerStateService protobuf types are currently missing from the generated files. To fix this:

## Prerequisites

- Install Protocol Buffers compiler (`protoc`)
- Install Go protobuf plugins:
  ```bash
  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
  go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
  ```

## Steps to Regenerate

1. Run the existing generation script:

   ```bash
   cd services/user-service
   bash scripts/generate-proto.sh
   ```

2. Verify that the following types are generated in `proto/user_service.pb.go`:

   - `GetSchedulerStateRequest`
   - `GetSchedulerStateResponse`
   - `CreateSchedulerStateRequest`
   - `CreateSchedulerStateResponse`
   - `UpdateSM2StateRequest`
   - `UpdateSM2StateResponse`
   - `UpdateBKTStateRequest`
   - `UpdateBKTStateResponse`
   - `UpdateAbilityRequest`
   - `UpdateAbilityResponse`
   - `StartSessionRequest`
   - `StartSessionResponse`
   - `EndSessionRequest`
   - `EndSessionResponse`
   - `CreateBackupRequest`
   - `CreateBackupResponse`
   - `RestoreFromBackupRequest`
   - `RestoreFromBackupResponse`
   - `SchedulerState`

3. Verify that `RegisterSchedulerStateServiceServer` function is generated in `proto/user_service_grpc.pb.go`

4. Replace the stub `scheduler_state_handler.go` with proper implementation:

   - Import the generated pb types
   - Embed `pb.UnimplementedSchedulerStateServiceServer`
   - Implement all methods with proper request/response types
   - Add proper validation and error handling
   - Convert between internal models and protobuf messages

5. Uncomment the scheduler service registration in `main.go`:
   ```go
   pb.RegisterSchedulerStateServiceServer(grpcServer, schedulerStateHandler)
   ```

## Current Status

- ✅ Proto file contains SchedulerStateService definition
- ❌ Protobuf types not generated (protoc not available)
- ✅ Stub handler created to prevent compilation errors
- ❌ Service registration commented out in main.go

## Files to Update After Regeneration

- `internal/handlers/scheduler_state_handler.go` (replace stub with real implementation)
- `main.go` (uncomment service registration)
