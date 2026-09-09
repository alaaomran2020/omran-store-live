/** Omran VIP restricted Sheet sidebar. No public deployment is required. */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Omran VIP')
    .addItem('فتح لوحة الموظفين', 'showVipStaffConsole')
    .addItem('فحص الجداول', 'auditVipPilotSchema')
    .addToUi();
}

function showVipStaffConsole() {
  vipAuthorize_('SEARCH_CARD');
  const html = HtmlService.createHtmlOutputFromFile('vip-console')
    .setTitle('لوحة تشغيل Omran VIP');
  SpreadsheetApp.getUi().showSidebar(html);
}
