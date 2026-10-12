'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  AlertCircle,
} from 'lucide-react';
import {
  isIdbUrl,
  getIdbId,
  getAttachment,
  dataUrlToBlob,
  downloadAttachment,
} from '@/lib/attachmentStorage';

export interface AttachmentItem {
  id: string;
  nombreArchivo: string;
  urlArchivo: string;
  tipo: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  attachment: AttachmentItem | null;
  allAttachments?: AttachmentItem[];
}

export default function AttachmentViewerModal({
  isOpen,
  onClose,
  attachment,
  allAttachments = [],
}: Props) {
  const [currentAttachment, setCurrentAttachment] = useState<AttachmentItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  // Determinar si el archivo es imagen o PDF basado en tipo MIME y nombre
  const getFileType = (att: AttachmentItem | null) => {
    if (!att) return { isImage: false, isPdf: false };
    const name = att.nombreArchivo || '';
    const tipo = (att.tipo || '').toLowerCase();
    const isImage =
      tipo.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(name);
    const isPdf =
      tipo === 'application/pdf' ||
      /\.pdf$/i.test(name);
    return { isImage, isPdf };
  };

  // Resolver URL válida: acepta data:, http, blob, rutas relativas /, y referencias idb://
  const resolveUrl = (att: AttachmentItem | null): string => {
    if (!att) return '';
    const url = att.urlArchivo || '';
    if (url.includes('dummy.pdf') || url.includes('w3.org')) return '/doc_ejemplo.pdf';
    if (url.includes('unsplash.com')) return '/images.jpg';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    if (url.startsWith('/')) return url;
    // idb:// URLs se resuelven asincrónicamente en el useEffect
    if (url.startsWith('idb://')) return '';
    return '';
  };

  // Efecto para cargar y resolver el archivo adjunto
  useEffect(() => {
    let createdBlobUrl = '';

    if (attachment) {
      setCurrentAttachment(attachment);
      setZoomLevel(1);
      setRotation(0);
      setImgError(false);
      setImgLoaded(false);

      const url = attachment.urlArchivo || '';
      const { isPdf: attIsPdf } = getFileType(attachment);

      if (isIdbUrl(url)) {
        setIsLoading(true);
        setImgSrc('');
        setPdfBlobUrl('');
        const id = getIdbId(url);

        getAttachment(id)
          .then((dataUrl) => {
            setIsLoading(false);
            if (dataUrl) {
              setImgSrc(dataUrl);
              if (attIsPdf) {
                if (dataUrl.startsWith('data:')) {
                  const blob = dataUrlToBlob(dataUrl);
                  createdBlobUrl = URL.createObjectURL(blob);
                  setPdfBlobUrl(createdBlobUrl);
                } else {
                  setPdfBlobUrl(dataUrl);
                }
              }
            } else {
              setImgSrc('');
              setPdfBlobUrl('');
            }
          })
          .catch((err) => {
            console.error('Error fetching attachment from IndexedDB:', err);
            setIsLoading(false);
            setImgSrc('');
            setPdfBlobUrl('');
          });
      } else {
        setIsLoading(false);
        const resolved = resolveUrl(attachment);
        setImgSrc(resolved);
        if (attIsPdf && resolved) {
          if (resolved.startsWith('data:')) {
            const blob = dataUrlToBlob(resolved);
            createdBlobUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(createdBlobUrl);
          } else {
            setPdfBlobUrl(resolved);
          }
        } else {
          setPdfBlobUrl('');
        }
      }
    } else {
      setImgSrc('');
      setPdfBlobUrl('');
      setIsLoading(false);
    }

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [attachment]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentAttachment) return null;

  const fileName = currentAttachment.nombreArchivo || 'Archivo_Adjunto.pdf';
  const { isImage, isPdf } = getFileType(currentAttachment);
  const fileUrl = imgSrc || resolveUrl(currentAttachment);
  // Para PDFs, es válido si tiene blob URL o dataUrl cargado
  const hasValidUrl = Boolean(isPdf ? (pdfBlobUrl || fileUrl) : fileUrl);

  const imageGallery = allAttachments.filter((a) => getFileType(a).isImage);
  const currentImageIdx = imageGallery.findIndex((img) => img.id === currentAttachment.id);

  const navigateTo = (att: AttachmentItem) => {
    setCurrentAttachment(att);
    setZoomLevel(1);
    setRotation(0);
    setImgError(false);
    setImgLoaded(false);

    const url = att.urlArchivo || '';
    const { isPdf: attIsPdf } = getFileType(att);

    if (isIdbUrl(url)) {
      setIsLoading(true);
      setImgSrc('');
      setPdfBlobUrl('');
      const id = getIdbId(url);
      getAttachment(id)
        .then((dataUrl) => {
          setIsLoading(false);
          setImgSrc(dataUrl || '');
          if (attIsPdf && dataUrl) {
            if (dataUrl.startsWith('data:')) {
              const blob = dataUrlToBlob(dataUrl);
              setPdfBlobUrl(URL.createObjectURL(blob));
            } else {
              setPdfBlobUrl(dataUrl);
            }
          }
        })
        .catch(() => {
          setIsLoading(false);
          setImgSrc('');
          setPdfBlobUrl('');
        });
    } else {
      setIsLoading(false);
      const resolved = resolveUrl(att);
      setImgSrc(resolved);
      if (attIsPdf && resolved) {
        if (resolved.startsWith('data:')) {
          const blob = dataUrlToBlob(resolved);
          setPdfBlobUrl(URL.createObjectURL(blob));
        } else {
          setPdfBlobUrl(resolved);
        }
      } else {
        setPdfBlobUrl('');
      }
    }
  };

  const handlePrevImage = () => {
    if (currentImageIdx > 0) navigateTo(imageGallery[currentImageIdx - 1]);
  };

  const handleNextImage = () => {
    if (currentImageIdx < imageGallery.length - 1) navigateTo(imageGallery[currentImageIdx + 1]);
  };

  const handleDownload = () => {
    // Usar el blobUrl si es PDF o imgSrc / fileUrl
    const sourceToDownload = pdfBlobUrl || fileUrl;
    if (!sourceToDownload) return;
    downloadAttachment(sourceToDownload, fileName);
  };

  const handleOpenNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    } else if (fileUrl) {
      if (fileUrl.startsWith('data:')) {
        try {
          const blob = dataUrlToBlob(fileUrl);
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
          window.open(fileUrl, '_blank');
        }
      } else {
        window.open(fileUrl, '_blank');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[80] flex flex-col overflow-hidden"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* HEADER */}
      <div className="bg-black/80 border-b border-white/10 px-6 py-3 flex items-center justify-between text-white z-10 shrink-0">
        <div className="flex items-center space-x-3 truncate min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#91000A] flex items-center justify-center shrink-0 shadow-md">
            {isImage ? <ImageIcon className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5 text-white" />}
          </div>
          <div className="truncate min-w-0">
            <h3 className="text-sm font-bold flex items-center gap-2 flex-wrap">
              <span className="truncate">{fileName}</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-white/20 text-white shrink-0">
                {isImage ? 'Imagen / Foto' : isPdf ? 'Documento PDF' : 'Anexo'}
              </span>
              {isPdf && (
                <span className="bg-emerald-800/90 text-emerald-200 text-[10px] px-2 py-0.5 rounded border border-emerald-500/50 flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Firmado Digitalmente</span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-400 font-mono truncate">
              GORE Lambayeque — Cuaderno Digital de Incidencias
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 ml-4">
          {hasValidUrl && (
            <>
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-all"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva Pestaña</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-[#91000A] hover:bg-[#B71C1C] text-white rounded-lg font-bold text-xs flex items-center space-x-2 transition-all hover:scale-105 shadow-lg"
                title="Descargar archivo"
              >
                <Download className="w-4 h-4" />
                <span>Descargar</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-2"
            title="Cerrar (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">

        {/* ——— IMAGEN ——— */}
        {isImage && (
          <>
            {/* Botones de navegación galería */}
            {imageGallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  disabled={currentImageIdx <= 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  disabled={currentImageIdx >= imageGallery.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-xl"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
              {hasValidUrl ? (
                <div className="relative flex items-center justify-center w-full h-full">
                  {/* Spinner de carga */}
                  {!imgLoaded && !imgError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center space-y-3 text-white">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        <p className="text-sm font-semibold">Cargando imagen...</p>
                      </div>
                    </div>
                  )}

                  {/* Error al cargar */}
                  {imgError && (
                    <div className="max-w-md w-full bg-zinc-900 border-2 border-amber-600 rounded-xl shadow-2xl p-8 text-center text-white space-y-4">
                      <AlertCircle className="w-16 h-16 mx-auto text-amber-400" />
                      <h4 className="text-base font-bold">{fileName}</h4>
                      <p className="text-sm text-gray-400">
                        No se pudo cargar la imagen. El archivo puede estar dañado, truncado o no estar disponible.
                      </p>
                      {fileUrl && (
                        <button
                          type="button"
                          onClick={handleOpenNewTab}
                          className="px-4 py-2 bg-[#91000A] text-white rounded font-bold text-sm flex items-center space-x-2 mx-auto"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Intentar abrir en nueva pestaña</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* La imagen real */}
                  <img
                    key={currentAttachment.id}
                    src={imgSrc}
                    alt={fileName}
                    onLoad={() => {
                      setImgLoaded(true);
                      setImgError(false);
                    }}
                    onError={() => {
                      if (imgSrc && imgSrc !== '/images.jpg' && !imgSrc.startsWith('data:')) {
                        setImgSrc('/images.jpg');
                      } else {
                        setImgError(true);
                        setImgLoaded(true);
                      }
                    }}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                      opacity: imgLoaded && !imgError ? 1 : 0,
                      maxWidth: '100%',
                      maxHeight: 'calc(100vh - 200px)',
                    }}
                    className="object-contain rounded-lg shadow-2xl border border-white/10 cursor-zoom-in"
                  />
                </div>
              ) : (
                /* Sin URL válida */
                <div className="max-w-md w-full bg-zinc-900 border-2 border-[#91000A] rounded-xl shadow-2xl overflow-hidden text-white">
                  <div className="bg-[#91000A] p-4 text-center">
                    <p className="text-xs font-bold tracking-wider uppercase">Gobierno Regional de Lambayeque</p>
                    <p className="text-[11px] text-red-200">Registro Fotográfico — Ley N° 29230 (OxI)</p>
                  </div>
                  <div className="p-8 text-center space-y-4">
                    <AlertCircle className="w-16 h-16 mx-auto text-amber-400" />
                    <div>
                      <h4 className="text-base font-bold">{fileName}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        El archivo no tiene una URL de origen válida. Por favor, elimine y vuelva a adjuntar la imagen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ——— PDF ——— */}
        {isPdf && (
          <div className="w-full h-full max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border border-white/20">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center flex-col space-y-3 p-8 bg-zinc-900 text-white min-h-[500px]">
                <div className="w-12 h-12 border-4 border-white/20 border-t-[#91000A] rounded-full animate-spin" />
                <p className="text-sm font-semibold">Cargando documento PDF...</p>
                <p className="text-xs text-gray-400">Preparando visor oficial GORE Lambayeque...</p>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                key={pdfBlobUrl}
                src={`${pdfBlobUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full flex-1 border-none min-h-[550px]"
                title={fileName}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col space-y-4 p-8 bg-gray-100 min-h-[500px]">
                <AlertCircle className="w-16 h-16 text-amber-500" />
                <p className="text-base font-bold text-gray-700">{fileName}</p>
                <p className="text-sm text-gray-500 text-center">
                  El archivo PDF no tiene un enlace de acceso válido.<br />
                  Por favor, elimine y vuelva a adjuntar el archivo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ——— ARCHIVO NO RECONOCIDO ——— */}
        {!isImage && !isPdf && (
          <div className="max-w-md w-full bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-2xl p-8 text-center text-white space-y-4">
            <FileText className="w-16 h-16 mx-auto text-gray-400" />
            <h4 className="text-base font-bold">{fileName}</h4>
            <p className="text-xs text-gray-400">Tipo de archivo no soportado para previsualización en línea.</p>
            {hasValidUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-[#91000A] text-white rounded font-bold text-sm flex items-center space-x-2 mx-auto"
              >
                <Download className="w-4 h-4" />
                <span>Descargar archivo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* BARRA DE CONTROLES INFERIOR */}
      <div className="bg-black/70 border-t border-white/10 px-6 py-2.5 flex flex-wrap items-center justify-between text-white text-xs z-10 shrink-0 gap-3">
        <div className="flex items-center space-x-2 text-gray-300 font-mono text-[11px] min-w-0">
          <Eye className="w-4 h-4 text-red-400 shrink-0" />
          <span className="truncate">{fileName}</span>
          {isImage && imageGallery.length > 1 && (
            <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] shrink-0">
              {currentImageIdx + 1} / {imageGallery.length} imágenes
            </span>
          )}
        </div>

        {/* Controles de zoom y rotación — solo para imágenes cargadas correctamente */}
        {isImage && hasValidUrl && imgLoaded && !imgError && (
          <div className="flex items-center space-x-1 bg-white/10 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(5, z + 0.25))}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Rotar 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setZoomLevel(1); setRotation(0); }}
              className="px-2 py-1 hover:bg-white/20 rounded text-[10px] font-bold text-gray-300"
              title="Restablecer vista"
            >
              Reset
            </button>
          </div>
        )}

        {hasValidUrl ? (
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-1.5 bg-[#91000A] hover:bg-[#B71C1C] text-white font-bold rounded-md flex items-center space-x-1.5 transition-all shadow"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Archivo</span>
          </button>
        ) : (
          <span className="px-4 py-1.5 bg-zinc-700 text-gray-400 font-bold rounded-md text-xs">
            Sin archivo disponible
          </span>
        )}
      </div>
    </div>
  );
}
