import jsPDF from 'jspdf';
import { PhotoRecord } from '../types';

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  wardNumber?: string;
  workerId?: string;
}

export async function generateMunicipalPdfReport(
  photos: PhotoRecord[],
  filters: ReportFilterOptions,
  title: string = 'MUNICIPAL FIELD WORK SANITATION REPORT'
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Function
  const renderHeader = (pageNumber: number, totalPagesEstimate: number = 1) => {
    // Header Banner
    doc.setFillColor(30, 64, 175); // #1e40af
    doc.rect(0, 0, pageWidth, 24, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SUMIT TAG – GPS MAP CAMERA', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(title, margin, 18);

    // Date & Page right aligned
    doc.setFontSize(8);
    const dateStr = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    doc.text(dateStr, pageWidth - margin, 11, { align: 'right' });
    doc.text(`Page ${pageNumber}`, pageWidth - margin, 18, { align: 'right' });
  };

  // Footer Function with Municipal Signature Block
  const renderFooter = () => {
    const footerY = pageHeight - 24;

    doc.setDrawColor(203, 213, 225);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    const sigW = (pageWidth - margin * 2) / 3;
    doc.text('PREPARED BY (MUKADAM / WORKER)', margin + 10, footerY + 8);
    doc.text('VERIFIED BY (SANITATION INSPECTOR)', margin + sigW + 10, footerY + 8);
    doc.text('APPROVED BY (MUNICIPAL ENGINEER)', margin + sigW * 2 + 10, footerY + 8);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.text('(Sign & Date)', margin + 18, footerY + 16);
    doc.text('(Sign & Stamp)', margin + sigW + 20, footerY + 16);
    doc.text('(Sign & Stamp)', margin + sigW * 2 + 20, footerY + 16);
  };

  let pageNum = 1;
  renderHeader(pageNum);

  let currentY = 32;

  // Overview summary block
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 2, 2, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('REPORT SUMMARY & FILTER CRITERIA', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const wardText = filters.wardNumber ? `Ward: ${filters.wardNumber}` : 'Ward: All Wards';
  const workerText = filters.workerId ? `Worker ID: ${filters.workerId}` : 'Worker: All Workers';
  const dateRangeText = filters.startDate ? `Range: ${filters.startDate} to ${filters.endDate || 'Present'}` : 'Range: All Time';

  doc.text(`Total Records: ${photos.length} Geotagged Photographs`, margin + 4, currentY + 13);
  doc.text(`${wardText}  |  ${workerText}`, margin + 4, currentY + 18);
  doc.text(dateRangeText, pageWidth - margin - 4, currentY + 13, { align: 'right' });

  currentY += 28;

  // If no photos
  if (photos.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No photographs found matching the selected filters.', margin, currentY + 10);
    renderFooter();
    return doc.output('blob');
  }

  // Render each photo card (2 photos per page to fit A4 neatly with full metadata)
  const itemHeight = 98; // height of photo item card

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    // Check if new page is needed
    if (currentY + itemHeight > pageHeight - 28) {
      renderFooter();
      doc.addPage();
      pageNum++;
      renderHeader(pageNum);
      currentY = 32;
    }

    // Photo Box Border
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, itemHeight - 6, 2, 2, 'FD');

    // Draw Thumbnail
    const imgWidth = 72;
    const imgHeight = 54;
    const imgX = margin + 4;
    const imgY = currentY + 6;

    try {
      const imgData = photo.stampedImageDataUrl || photo.originalImageDataUrl;
      if (imgData) {
        doc.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight);
      } else {
        doc.setFillColor(241, 245, 249);
        doc.rect(imgX, imgY, imgWidth, imgHeight, 'F');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('No image', imgX + 24, imgY + 28);
      }
    } catch {
      doc.setFillColor(241, 245, 249);
      doc.rect(imgX, imgY, imgWidth, imgHeight, 'F');
    }

    // Metadata Columns (to the right of the photo)
    const textX = imgX + imgWidth + 6;
    let textY = currentY + 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138); // deep blue
    doc.text(`Record #${i + 1}: ${photo.workCategory}`, textX, textY);

    textY += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    // Worker & Ward
    doc.setFont('helvetica', 'bold');
    doc.text('Worker: ', textX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${photo.workerName} (${photo.workerId})`, textX + 16, textY);

    textY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Ward No: ', textX, textY);
    doc.setFont('helvetica', 'normal');
    const wardStatus = photo.wardVerificationMethod === 'boundary_verified' ? '[Verified Boundary]' : '[Manual Select]';
    doc.text(`${photo.wardNumber} - ${photo.areaName || 'Area'} ${wardStatus}`, textX + 16, textY);

    textY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Date & Time: ', textX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${photo.formattedDate}  ${photo.formattedTime}`, textX + 22, textY);

    textY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('GPS Location: ', textX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${photo.latitude.toFixed(5)}° N, ${photo.longitude.toFixed(5)}° E`, textX + 22, textY);

    textY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Accuracy: ', textX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`±${photo.gpsAccuracy} m ${photo.altitude ? `| Alt: ${photo.altitude}m` : ''}`, textX + 18, textY);

    textY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Address: ', textX, textY);
    doc.setFont('helvetica', 'normal');
    const addr = photo.address?.formattedAddress || 'Not Available';
    const splitAddr = doc.splitTextToSize(addr, pageWidth - margin - textX - 4);
    doc.text(splitAddr, textX + 16, textY);

    if (photo.notes) {
      textY += splitAddr.length * 4 + 2;
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      doc.text(`Notes: ${photo.notes}`, textX, textY);
    }

    currentY += itemHeight;
  }

  renderFooter();

  return doc.output('blob');
}
