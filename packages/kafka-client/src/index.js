"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKafka = createKafka;
const kafkajs_1 = require("kafkajs");
function createKafka(config) {
    return new kafkajs_1.Kafka(config);
}
//# sourceMappingURL=index.js.map