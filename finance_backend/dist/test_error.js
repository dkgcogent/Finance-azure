"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const invoiceService_1 = require("./features/invoicing/services/invoiceService");
async function test() { try {
    await invoiceService_1.invoiceService.getGlobalInvoiceMaster();
    console.log('Success');
    process.exit(0);
}
catch (e) {
    console.error(e);
    process.exit(1);
} }
test();
