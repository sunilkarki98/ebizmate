"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDuration = parseDuration;
function parseDuration(durationStr) {
    if (!durationStr)
        return null;
    const match = durationStr.match(/^(\d+)([dhwmy])$/);
    if (!match)
        return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    const date = new Date();
    if (unit === 'h')
        date.setHours(date.getHours() + value);
    if (unit === 'd')
        date.setDate(date.getDate() + value);
    if (unit === 'w')
        date.setDate(date.getDate() + value * 7);
    if (unit === 'm')
        date.setMonth(date.getMonth() + value);
    if (unit === 'y')
        date.setFullYear(date.getFullYear() + value);
    return date;
}
//# sourceMappingURL=dates.js.map