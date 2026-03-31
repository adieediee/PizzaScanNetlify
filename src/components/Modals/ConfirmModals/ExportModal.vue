<template>
    <div id="ExportModal" class="modal" v-if="modalStore.isModalOpen('export')">
      <div class="confirm-modal-content">
        <div class="modal-title">
            <h2>{{$t('modals.export.title')}}</h2>
            <span id="closeExportModalButton" class="btn btn-outlined btn-close" @click="modalStore.closeModal()">
                <fa :icon="['fas', 'xmark']" />
            </span>
        </div>
        <p>{{$t('modals.export.title2')}}</p>
        <div class="div-button">
            <button id="cancelExportModalButton" class="btn btn-outlined" @click="modalStore.closeModal()">{{$t('modals.imageAIannotations.cancelButton')}}</button>
            <button id="exportAnnotationButton" class="btn btn-filled" @click="exportToExcel()">{{$t('modals.export.exportButton')}}</button>
        </div>
      </div>
    </div>
</template>
  
<script setup>
import { useModalStore } from '@/stores/ModalStore';
import { useAnnotationStore } from '@/stores/AnnotationsStore';
import { useImageStore } from '@/stores/ImageStore';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const modalStore = useModalStore();
const annotationStore = useAnnotationStore();
const imageStore = useImageStore();



const exportToExcel = async () => {
  const defects = annotationStore.microtubularDefects;
  const defectNames = defects.map(d => d.name);
  const images = imageStore.uploadedImages;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pizza Inspection");

  const headerStyle = {
    font: { bold: true, color: { argb: "000000" }, size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "C5D9F1" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
  };

  const normalStyle = {
    alignment: { horizontal: "center", wrapText: true },
    font: { size: 10 },
    border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
  };

  const normalBoldStyle = {
    font: { bold: true, size: 10 },
    alignment: { horizontal: "center", wrapText: true },
    border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
  };

  // Title row
  worksheet.addRow([]);
  worksheet.addRow([]);
  const titleColEnd = String.fromCharCode('B'.charCodeAt(0) + defectNames.length + 1);
  worksheet.addRow(["PIZZA INSPECTION REPORT"]);
  worksheet.mergeCells(`A3:${titleColEnd}3`);
  worksheet.getCell("A3").font = { bold: true, size: 13 };
  worksheet.getCell("A3").alignment = { horizontal: "center" };
  worksheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "C5D9F1" } };

  // Meta rows
  worksheet.addRow([]);
  worksheet.addRow(["Inspector", "", "Batch No", "", "Date", ""]).eachCell(cell => { Object.assign(cell, normalStyle); });
  worksheet.addRow(["Location", "", "Line", "", "Shift", ""]).eachCell(cell => { Object.assign(cell, normalStyle); });
  worksheet.addRow([]);

  // Column headers: Image | defect1 | defect2 | ... | TOTAL
  const dataStartRow = 9;
  worksheet.addRow(["Image", ...defectNames, "TOTAL"]);
  worksheet.getRow(dataStartRow - 1).eachCell(cell => { Object.assign(cell, normalBoldStyle); });

  // Data rows — one per image
  let rowIndex = dataStartRow;
  images.forEach(image => {
    const annotations = annotationStore.getAnnotations(image);
    const counts = defectNames.map(name =>
      annotations.filter(a => a.microtubularDefect === name).length
    );
    const totalFormula = { formula: `=SUM(B${rowIndex}:${String.fromCharCode('A'.charCodeAt(0) + defectNames.length)}${rowIndex})` };
    const row = worksheet.addRow([image.imageName, ...counts, totalFormula]);
    row.eachCell(cell => { Object.assign(cell, normalStyle); });
    rowIndex++;
  });

  // Totals row
  const sumRow = defectNames.map((_, i) => ({
    formula: `=SUM(${String.fromCharCode('B'.charCodeAt(0) + i)}${dataStartRow}:${String.fromCharCode('B'.charCodeAt(0) + i)}${rowIndex - 1})`
  }));
  const totalSumFormula = { formula: `=SUM(${String.fromCharCode('B'.charCodeAt(0) + defectNames.length)}${dataStartRow}:${String.fromCharCode('B'.charCodeAt(0) + defectNames.length)}${rowIndex - 1})` };
  const totalsRow = worksheet.addRow(["TOTAL", ...sumRow, totalSumFormula]);
  totalsRow.eachCell(cell => { Object.assign(cell, normalBoldStyle); });
  rowIndex++;

  // Percentage row
  const totalCol = String.fromCharCode('B'.charCodeAt(0) + defectNames.length);
  const totalCellRef = `${totalCol}${rowIndex - 1}`;
  const pctRow = defectNames.map((_, i) => ({
    formula: `=IF(${totalCellRef}=0,0,ROUND(${String.fromCharCode('B'.charCodeAt(0) + i)}${rowIndex - 1}/${totalCellRef}*100,1))`
  }));
  const pctTotalFormula = { formula: `=IF(${totalCellRef}=0,0,ROUND(${totalCellRef}/${totalCellRef}*100,1))` };
  const percentRow = worksheet.addRow(["%", ...pctRow, pctTotalFormula]);
  percentRow.eachCell((cell, colNumber) => {
    Object.assign(cell, normalBoldStyle);
    if (colNumber > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "99CCFF" } };
  });

  // Outcome and notes
  worksheet.addRow([]);
  const outcomeRow = worksheet.addRow(["Outcome:", imageStore.projectOutcome || ""]);
  outcomeRow.getCell(1).style = headerStyle;
  outcomeRow.getCell(2).style = normalStyle;

  const commentRow = worksheet.addRow(["Notes:", imageStore.projectDescription || ""]);
  commentRow.getCell(1).style = headerStyle;
  commentRow.getCell(2).style = normalStyle;

  // Image descriptions
  const hasDescriptions = images.some(img => img.description);
  if (hasDescriptions) {
    worksheet.addRow([]);
    const descHeader = worksheet.addRow(["Image", "Description"]);
    descHeader.eachCell(cell => { Object.assign(cell, normalBoldStyle); });
    images.forEach(image => {
      if (image.description) {
        const r = worksheet.addRow([image.imageName, image.description]);
        r.getCell(1).style = normalStyle;
        r.getCell(2).style = normalStyle;
      }
    });
  }

  // Column widths
  worksheet.getColumn(1).width = 20;
  for (let i = 2; i <= defectNames.length + 2; i++) {
    worksheet.getColumn(i).width = 14;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "PizzaScan_Inspection_Report.xlsx");

  modalStore.closeModal();
};
</script>
