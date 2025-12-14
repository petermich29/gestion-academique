// src/components/ui/Modal.jsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// 1. DRAGGABLE MODAL (EXISTANT)
// ============================================

export const DraggableModal = ({ isOpen, onClose, title, children, widthClass = "max-w-2xl" }) => {
  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const overlayRef = useRef(null);

  const [pos, setPos] = useState({ top: null, left: null });
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef({ startX: 0, startY: 0, initLeft: 0, initTop: 0, w: 0, h: 0 }); // Ajout de w et h pour robustesse

  useEffect(() => {
    if (!isOpen) return;
    const computeCenter = () => {
      const w = Math.min(window.innerWidth, 1100);
      // Correction de la formule de centrage initial
      const left = Math.max(16, (window.innerWidth - Math.min(w, modalRef.current?.offsetWidth || 700)) / 2);
      const top = Math.max(24, (window.innerHeight - (modalRef.current?.offsetHeight || 600)) / 6);
      setPos({ top, left });
    };
    // Exécution initiale et écoute du redimensionnement
    computeCenter();
    window.addEventListener("resize", computeCenter);
    return () => window.removeEventListener("resize", computeCenter);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const startDrag = (x, y) => {
    if (!modalRef.current) return;
    setDragging(true);
    const rect = modalRef.current.getBoundingClientRect();
    dragStateRef.current = { startX: x, startY: y, initLeft: rect.left, initTop: rect.top, w: rect.width, h: rect.height };
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (x, y) => {
    if (!dragging) return;
    const ds = dragStateRef.current;
    let left = ds.initLeft + (x - ds.startX);
    let top = ds.initTop + (y - ds.startY);

    left = Math.max(8, Math.min(window.innerWidth - ds.w - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - ds.h - 8, top));

    setPos({ left, top });
  };

  const endDrag = () => {
    setDragging(false);
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    const handleMove = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      onPointerMove(x, y);
    };
    if (dragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("touchend", endDrag);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchend", endDrag);
    };
  }, [dragging]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === overlayRef.current && onClose()}
        >
          <motion.div
            ref={modalRef}
            className={`absolute bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden ${widthClass}`}
            style={{ top: pos.top, left: pos.left, touchAction: "none" }}
            initial={{ opacity: 0, y: -12, scale: 0.995 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", stiffness: 160, damping: 18 },
            }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              ref={headerRef}
              className="modal-drag-handle flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm"
              onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
              onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
              style={{ cursor: dragging ? "grabbing" : "grab" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 block" />
                </div>
                <div className="min-w-0 text-sm font-semibold text-gray-800 truncate">{title}</div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-transparent">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// 2. CONFIRM MODAL (MANQUANT - CORRECTION)
// ============================================
export const ConfirmModal = ({ isOpen, onClose, title, children, widthClass = "max-w-md" }) => {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === overlayRef.current && onClose()}
        >
          <motion.div
            ref={modalRef}
            className={`bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden ${widthClass} w-full max-h-[90vh]`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", stiffness: 200, damping: 20 },
            }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-red-50/50">
              <div className="text-sm font-semibold text-gray-800 truncate">{title}</div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 bg-transparent max-h-[calc(90vh-60px)] overflow-y-auto">
              {children}
            </div>
            
            {/* Note: Le footer (boutons) est géré par les 'children' dans Administration.jsx */}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};