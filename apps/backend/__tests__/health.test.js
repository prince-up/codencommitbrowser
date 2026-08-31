"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
describe('Health Check API', () => {
    it('should return UP on GET /api/health', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('UP');
        expect(res.body.timestamp).toBeDefined();
    });
    it('should return READY on GET /api/health/ready', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/health/ready');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('READY');
    });
});
//# sourceMappingURL=health.test.js.map