import { jsPDF } from 'jspdf';
import logoActaCoe from '../assets/logo_acta_coe.png';
import logoNuevoEcuador from '../assets/logoMainSec.png';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const ORANGE: [number, number, number] = [230, 112, 0];
const PALE_YELLOW: [number, number, number] = [255, 253, 210];

export interface ActaPdfData {
  id: number;
  detalle: string;
  fecha_sesion: string;
  fecha_finalizado?: string | null;
  creador?: string;
}

export interface ResolucionPdfData {
  id: number;
  detalle: string;
  fecha_cumplimiento?: string | null;
  responsable?: string;
  mesas?: Array<{
    mesa_nombre?: string;
    mesa_abreviatura?: string;
  }>;
}

export interface DpaPdfData {
  coeAbreviatura?: string;
  provinciaId?: number;
  provinciaNombre?: string;
  cantonId?: number;
  cantonNombre?: string;
}

export interface ActaCoePdfInput {
  acta: ActaPdfData;
  resoluciones: ResolucionPdfData[];
  emergenciaNombre: string;
  fechaInicioDesastre?: string | null;
  dpa: DpaPdfData;
}

export interface ActaCoePdfResult {
  actaCompleta: Blob;
  resoluciones: Blob;
  nombres: {
    actaCompleta: string;
    resoluciones: string;
  };
}

interface PdfContext {
  doc: jsPDF;
  title: string;
  logos: [PdfImage | null, PdfImage | null];
  ecuadorLogo: string | null;
  resolutionLogo: PdfImage | null;
  input: ActaCoePdfInput;
  y: number;
}

interface PdfImage {
  dataUrl: string;
  width: number;
  height: number;
}

const safeFilePart = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'COE';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatLongDateUpper = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date).toLocaleUpperCase('es-EC');
};

const resolveLevel = (dpa: DpaPdfData) => {
  const abbreviation = String(dpa.coeAbreviatura || '').toUpperCase();
  if (abbreviation.includes('NAC') || Number(dpa.provinciaId || 0) <= 0) return 'NACIONAL';
  if (abbreviation.includes('PROV') || Number(dpa.cantonId || 0) <= 0) return 'PROVINCIAL';
  return 'CANTONAL';
};

const resolveLocation = (dpa: DpaPdfData) => {
  const level = resolveLevel(dpa);
  if (level === 'NACIONAL') return 'Ecuador';
  if (level === 'PROVINCIAL') return dpa.provinciaNombre || 'Provincia no especificada';
  return dpa.cantonNombre || dpa.provinciaNombre || 'Cantón no especificado';
};

const resolveDpaLabel = (dpa: DpaPdfData) => {
  const level = resolveLevel(dpa);
  if (level === 'NACIONAL') return 'Nacional - Ecuador';
  if (level === 'PROVINCIAL') return `Provincia: ${dpa.provinciaNombre || '-'}`;
  return `Provincia: ${dpa.provinciaNombre || '-'} / Cantón: ${dpa.cantonNombre || '-'}`;
};

const resolveLevelLower = (dpa: DpaPdfData) =>
  resolveLevel(dpa).toLocaleLowerCase('es-EC');

const imageToDataUrl = (source: string): Promise<PdfImage | null> => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      resolve(null);
      return;
    }
    context.drawImage(image, 0, 0);
    resolve({
      dataUrl: canvas.toDataURL('image/png'),
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  };
  image.onerror = () => resolve(null);
  image.src = source;
});

const addImageContained = (
  doc: jsPDF,
  image: PdfImage,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) => {
  const aspectRatio = image.width / image.height;
  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  doc.addImage(
    image.dataUrl,
    'PNG',
    x + ((maxWidth - width) / 2),
    y + ((maxHeight - height) / 2),
    width,
    height,
  );
};

const drawDocumentHeader = (context: PdfContext) => {
  const { doc, logos, title } = context;
  const headerHeight = 26;
  const titleWidth = 112;

  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.35);
  doc.setFillColor(...ORANGE);
  doc.rect(MARGIN, MARGIN, titleWidth, headerHeight, 'FD');
  doc.rect(MARGIN + titleWidth, MARGIN, CONTENT_WIDTH - titleWidth, headerHeight);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(14);
  doc.text(title, MARGIN + 5, MARGIN + 16, { maxWidth: titleWidth - 10 });

  const [, coeLogo] = logos;
  if (coeLogo) {
    addImageContained(
      doc,
      coeLogo,
      MARGIN + titleWidth + 2,
      MARGIN + 2,
      CONTENT_WIDTH - titleWidth - 4,
      headerHeight - 4,
    );
  }

  doc.setTextColor(20, 20, 20);
  context.y = MARGIN + headerHeight;
};

const drawInfoRow = (
  context: PdfContext,
  cells: Array<{ label: string; value: string; labelWidth: number; valueWidth: number }>,
  height = 9,
) => {
  const { doc } = context;
  let x = MARGIN;
  cells.forEach((cell) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(x, context.y, cell.labelWidth, height, 'FD');
    doc.setFillColor(...PALE_YELLOW);
    doc.rect(x + cell.labelWidth, context.y, cell.valueWidth, height, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text(cell.label, x + 2, context.y + 5.7, { maxWidth: cell.labelWidth - 4 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(cell.value || '-', x + cell.labelWidth + 2, context.y + 5.7, {
      maxWidth: cell.valueWidth - 4,
    });
    x += cell.labelWidth + cell.valueWidth;
  });
  context.y += height;
};

const drawSessionInfo = (context: PdfContext) => {
  const { acta, emergenciaNombre, dpa } = context.input;
  drawInfoRow(context, [{
    label: 'Emergencia/Desastre:',
    value: emergenciaNombre || '-',
    labelWidth: 57,
    valueWidth: CONTENT_WIDTH - 57,
  }]);
  drawInfoRow(context, [{
    label: 'Fecha de inicio de la Emergencia/Desastre:',
    value: formatDate(context.input.fechaInicioDesastre),
    labelWidth: 80,
    valueWidth: CONTENT_WIDTH - 80,
  }]);
  drawInfoRow(context, [
    {
      label: 'Fecha de inicio de la sesión:',
      value: formatDate(acta.fecha_sesion),
      labelWidth: 57,
      valueWidth: 35,
    },
    {
      label: 'Hora de inicio:',
      value: formatTime(acta.fecha_sesion),
      labelWidth: 46,
      valueWidth: CONTENT_WIDTH - 57 - 35 - 46,
    },
  ]);
  drawInfoRow(context, [{
    label: 'Lugar de sesión:',
    value: resolveLocation(dpa),
    labelWidth: 57,
    valueWidth: CONTENT_WIDTH - 57,
  }]);
  drawInfoRow(context, [{
    label: 'DPA / ámbito:',
    value: resolveDpaLabel(dpa),
    labelWidth: 57,
    valueWidth: CONTENT_WIDTH - 57,
  }]);
};

const drawSectionTitle = (context: PdfContext, title: string) => {
  const { doc } = context;
  doc.setFillColor(...ORANGE);
  doc.setDrawColor(30, 30, 30);
  doc.rect(MARGIN, context.y, CONTENT_WIDTH, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(title, PAGE_WIDTH / 2, context.y + 5.4, { align: 'center' });
  doc.setTextColor(20, 20, 20);
  context.y += 8;
};

const addContinuationPage = (context: PdfContext, sectionTitle: string) => {
  context.doc.addPage();
  drawDocumentHeader(context);
  drawSectionTitle(context, `${sectionTitle} (CONTINUACIÓN)`);
};

const ensureSpace = (context: PdfContext, requiredHeight: number, sectionTitle: string) => {
  if (context.y + requiredHeight <= PAGE_HEIGHT - MARGIN) return;
  addContinuationPage(context, sectionTitle);
};

const drawDetail = (context: PdfContext) => {
  drawSectionTitle(context, 'INFORMACIÓN DEL ACTA');
  const lines = context.doc.splitTextToSize(context.input.acta.detalle || '-', CONTENT_WIDTH - 8) as string[];
  const height = Math.max(14, (lines.length * 4.3) + 6);
  ensureSpace(context, height, 'INFORMACIÓN DEL ACTA');
  context.doc.setFillColor(...PALE_YELLOW);
  context.doc.rect(MARGIN, context.y, CONTENT_WIDTH, height, 'FD');
  context.doc.setFont('helvetica', 'normal');
  context.doc.setFontSize(8.5);
  context.doc.text(lines, MARGIN + 4, context.y + 6);
  context.y += height;
};

const resolutionMetadata = (resolution: ResolucionPdfData) => {
  const mesas = (resolution.mesas || [])
    .map((mesa) => mesa.mesa_abreviatura || mesa.mesa_nombre || '')
    .filter(Boolean)
    .join(', ');
  const parts = [
    mesas ? `Mesas: ${mesas}` : '',
    resolution.responsable ? `Responsable: ${resolution.responsable}` : '',
    resolution.fecha_cumplimiento ? `Cumplimiento: ${formatDate(resolution.fecha_cumplimiento)}` : '',
  ].filter(Boolean);
  return parts.join('  |  ');
};

const drawResolution = (
  context: PdfContext,
  resolution: ResolucionPdfData,
  index: number,
) => {
  const { doc } = context;
  const textLines = doc.splitTextToSize(resolution.detalle || '-', CONTENT_WIDTH - 16) as string[];
  const metaLines = doc.splitTextToSize(resolutionMetadata(resolution), CONTENT_WIDTH - 16) as string[];
  const allLines = [
    ...textLines.map((line) => ({ text: line, meta: false })),
    ...metaLines.map((line) => ({ text: line, meta: true })),
  ];

  let firstLine = true;
  allLines.forEach((line, lineIndex) => {
    ensureSpace(context, 5, 'ACUERDOS DE LA SESIÓN ACTUAL');
    doc.setFont('helvetica', line.meta ? 'italic' : 'normal');
    doc.setFontSize(line.meta ? 7.2 : 8.4);
    if (firstLine) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}.`, MARGIN + 4, context.y + 3.6);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(line.text, MARGIN + 12, context.y + 3.6);
    context.y += line.meta ? 3.8 : 4.2;
    firstLine = false;
    if (lineIndex === textLines.length - 1 && metaLines.length > 0) context.y += 0.5;
  });
  context.y += 2;
};

const drawAgreements = (context: PdfContext) => {
  drawSectionTitle(context, 'ACUERDOS DE LA SESIÓN ACTUAL');
  const level = resolveLevel(context.input.dpa).toLocaleLowerCase('es-EC');
  const date = formatDate(context.input.acta.fecha_sesion);
  const intro = `El COE ${level}, en sesión del ${date}, acordó las siguientes resoluciones:`;
  const introLines = context.doc.splitTextToSize(intro, CONTENT_WIDTH - 8) as string[];
  context.doc.setFont('helvetica', 'normal');
  context.doc.setFontSize(8.5);
  context.doc.text(introLines, MARGIN + 4, context.y + 6);
  context.y += (introLines.length * 4.2) + 6;

  if (context.input.resoluciones.length === 0) {
    context.doc.setFont('helvetica', 'italic');
    context.doc.text('No existen resoluciones registradas para esta acta.', MARGIN + 4, context.y + 4);
    context.y += 10;
    return;
  }

  context.input.resoluciones.forEach((resolution, index) => {
    drawResolution(context, resolution, index);
  });
};

const drawFinalRecord = (context: PdfContext) => {
  if (context.y + 42 > PAGE_HEIGHT - MARGIN) {
    context.doc.addPage();
    drawDocumentHeader(context);
  }
  drawSectionTitle(context, 'REGISTRO FINAL');
  const { doc } = context;
  const boxHeight = 26;
  const leftWidth = 103;
  doc.rect(MARGIN, context.y, leftWidth, boxHeight);
  doc.rect(MARGIN + leftWidth, context.y, CONTENT_WIDTH - leftWidth, boxHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('FIRMA DEL ENCARGADO DE LA ELABORACIÓN DEL ACTA DEL COE', MARGIN + 2, context.y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.text(`Elaborado por: ${context.input.acta.creador || '-'}`, MARGIN + 3, context.y + boxHeight - 4);

  const note = 'NOTA: El documento debe ser revisado y firmado por las autoridades correspondientes. Esta copia digital contiene la información registrada en el sistema.';
  const noteLines = doc.splitTextToSize(note, CONTENT_WIDTH - leftWidth - 8) as string[];
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA', MARGIN + leftWidth + ((CONTENT_WIDTH - leftWidth) / 2), context.y + 7, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.text(noteLines, MARGIN + leftWidth + 4, context.y + 11);
  context.y += boxHeight;

  drawInfoRow(context, [
    {
      label: 'Fecha de la sesión:',
      value: formatDate(context.input.acta.fecha_sesion),
      labelWidth: 38,
      valueWidth: 55,
    },
    {
      label: 'Hora de la sesión:',
      value: formatTime(context.input.acta.fecha_sesion),
      labelWidth: 38,
      valueWidth: CONTENT_WIDTH - 38 - 55 - 38,
    },
  ], 8);
};

const drawResolutionBrand = (doc: jsPDF, resolutionLogo: PdfImage | null) => {
  if (resolutionLogo) {
    addImageContained(doc, resolutionLogo, 13, 10, 46.5, 21.75);
    return;
  }

  doc.setTextColor(55, 55, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('República del Ecuador', 14, 24);
};

const drawResolutionOfficialHeader = (context: PdfContext, compact = false) => {
  const { doc, input } = context;
  const level = resolveLevel(input.dpa);
  const date = formatLongDateUpper(input.acta.fecha_sesion);

  if (!compact) {
    drawResolutionBrand(doc, context.resolutionLogo);
  }

  doc.setTextColor(55, 55, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 11 : 13);
  doc.text('RESOLUCIONES', PAGE_WIDTH / 2, compact ? 22 : 62, { align: 'center' });
  doc.setFontSize(compact ? 10 : 12);
  doc.text(`COE ${level} - ${date}`, PAGE_WIDTH / 2, compact ? 29 : 70, { align: 'center' });
  context.y = compact ? 42 : 88;
};

const drawResolutionOfficialFooter = (doc: jsPDF, ecuadorLogo: string | null) => {
  doc.setTextColor(96, 75, 145);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Secretaría de Gestión de Riesgos', 14, PAGE_HEIGHT - 18);

  doc.setTextColor(35, 45, 120);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9);
  doc.text('EL NUEVO', PAGE_WIDTH - 59, PAGE_HEIGHT - 26);
  doc.setFontSize(18);
  doc.text('ECUADOR', PAGE_WIDTH - 71, PAGE_HEIGHT - 17);
  if (ecuadorLogo) {
    doc.addImage(ecuadorLogo, 'PNG', PAGE_WIDTH - 35, PAGE_HEIGHT - 31, 20, 18);
  }
  doc.setTextColor(20, 20, 20);
};

const ensureOfficialResolutionSpace = (context: PdfContext, requiredHeight: number) => {
  if (context.y + requiredHeight <= PAGE_HEIGHT - 42) return;
  context.doc.addPage();
  drawResolutionOfficialHeader(context, true);
};

const drawOfficialResolutionItem = (
  context: PdfContext,
  resolution: ResolucionPdfData,
  index: number,
) => {
  const { doc } = context;
  const lines = doc.splitTextToSize(resolution.detalle || '-', 142) as string[];
  const height = Math.max(14, lines.length * 7) + 6;
  ensureOfficialResolutionSpace(context, height);

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`${index + 1}.`, 30, context.y);
  doc.text(lines, 38, context.y);
  context.y += height;
};

const drawResolutionCertificate = (context: PdfContext) => {
  const { doc, input } = context;
  const level = resolveLevel(input.dpa);
  doc.addPage();
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('Lo certifico', PAGE_WIDTH / 2, 28, { align: 'center' });

  const blocks = [
    {
      x: 58,
      name: 'Autoridad COE',
      role: `Presidente/a del COE ${level}`,
    },
    {
      x: 150,
      name: 'Secretario/a COE',
      role: `Secretario/a del COE - ${level}`,
    },
  ];

  blocks.forEach((block) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(block.name, block.x, 100, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const roleLines = doc.splitTextToSize(block.role, 70) as string[];
    doc.text(roleLines, block.x, 108, { align: 'center' });
  });
};

const buildResolucionesPdf = (
  input: ActaCoePdfInput,
  ecuadorLogo: string | null,
  resolutionLogo: PdfImage | null,
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const context: PdfContext = {
    doc,
    input,
    logos: [null, null],
    ecuadorLogo,
    resolutionLogo,
    title: 'RESOLUCIONES',
    y: MARGIN,
  };
  const level = resolveLevelLower(input.dpa);
  const date = formatLongDateUpper(input.acta.fecha_sesion);

  drawResolutionOfficialHeader(context);

  const intro = `El COE ${level}, en sesión del día ${date}, por unanimidad de los miembros plenos y en ejercicio de las funciones principales reconocidas en la Ley Orgánica para la Gestión Integral del Riesgo de Desastres, resolvió:`;
  const introLines = doc.splitTextToSize(intro, 160) as string[];
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(introLines, 28, context.y);
  context.y += (introLines.length * 7) + 14;

  if (input.resoluciones.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No existen resoluciones registradas para esta acta.', 28, context.y);
  } else {
    input.resoluciones.forEach((resolution, index) => {
      drawOfficialResolutionItem(context, resolution, index);
    });
  }

  drawResolutionCertificate(context);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawResolutionOfficialFooter(doc, ecuadorLogo);
  }

  return doc.output('blob');
};

const buildPdf = (
  input: ActaCoePdfInput,
  logos: [PdfImage | null, PdfImage | null],
  resolutionsOnly: boolean,
) => {
  const level = resolveLevel(input.dpa);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const context: PdfContext = {
    doc,
    input,
    logos,
    ecuadorLogo: null,
    resolutionLogo: null,
    title: resolutionsOnly
      ? `RESOLUCIONES – COE ${level}`
      : `ACTA DE SESIÓN – COE ${level}`,
    y: MARGIN,
  };

  drawDocumentHeader(context);
  drawSessionInfo(context);
  if (!resolutionsOnly) drawDetail(context);
  drawAgreements(context);
  drawFinalRecord(context);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Acta COE N.º ${input.acta.id} · Página ${page} de ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, {
      align: 'center',
    });
  }

  return doc.output('blob');
};

export const createActaCoePdfs = async (input: ActaCoePdfInput): Promise<ActaCoePdfResult> => {
  const [coeLogo, ecuadorLogo] = await Promise.all([
    imageToDataUrl(logoActaCoe),
    imageToDataUrl(logoNuevoEcuador),
  ]);
  const logos = [null, coeLogo] as [PdfImage | null, PdfImage | null];
  const location = safeFilePart(resolveLocation(input.dpa));
  const suffix = `${input.acta.id}_${location}`;

  return {
    actaCompleta: buildPdf(input, logos, false),
    resoluciones: buildResolucionesPdf(input, ecuadorLogo?.dataUrl ?? null, coeLogo),
    nombres: {
      actaCompleta: `Acta_COE_${suffix}.pdf`,
      resoluciones: `Resoluciones_COE_${suffix}.pdf`,
    },
  };
};
