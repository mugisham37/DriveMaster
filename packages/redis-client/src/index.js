"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedis = createRedis;
const ioredis_1 = __importDefault(require("ioredis"));
function createRedis(url) {
    return new ioredis_1.default(url);
}
//# sourceMappingURL=index.js.map