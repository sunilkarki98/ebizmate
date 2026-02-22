"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_item_dto_1 = require("./create-item.dto");
class UpdateItemDto extends (0, swagger_1.PartialType)(create_item_dto_1.CreateItemDto) {
}
exports.UpdateItemDto = UpdateItemDto;
//# sourceMappingURL=update-item.dto.js.map