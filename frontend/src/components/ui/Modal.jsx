// src/components/ui/Modal.jsx

import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- MODAL DRAGGABLE ---
export const DraggableModal = ({ isOpen, onClose, title, children, widthClass = "max-w-xl" }) => {
  const modalRef = useRef(null);
  const [modalPos, setModalPos] = useState({ top: 40, left: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Logic pour centrer la modale au début, puis laisser le drag gérer la position
      const centerX = window.innerWidth / 2 - 260; 
      setModalPos({ top: 40, left: centerX > 0 ? centerX : 16 });
    }
  }, [isOpen]);

  const handleMouseDown = (e) => {
    if (!modalRef.current) return;
    const isHeaderClick = e.target.closest(".modal-drag-handle");
    if (!isHeaderClick) return;

    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging || !modalRef.current) return;
      const { offsetWidth: w, offsetHeight: h } = modalRef.current;
      let left = e.clientX - dragOffset.x;
      let top = e.clientY - dragOffset.y;
      left = Math.max(0, Math.min(window.innerWidth - w, left));
      top = Math.max(0, Math.min(window.innerHeight - h, top));
      setModalPos({ top, left });
    },
    [dragging, dragOffset]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 bg-black bg-opacity-40 z-40 flex items-start justify-center pt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={modalRef}
            className={`bg-white rounded-xl shadow-2xl w-full ${widthClass} mx-3 z-50 overflow-hidden absolute`}
            style={{
              top: modalPos.top,
              left: modalPos.left,
              // SUPPRIMER LA LIGNE CURSOR ICI
            }}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 130 } }}
            exit={{ y: -30, opacity: 0 }}
          >
            {/* Déplacer le style cursor ici, sur le header uniquement */}
            <div
              className="modal-drag-handle flex items-center justify-between text-base font-semibold p-3 border-b bg-gray-50 text-gray-800"
              style={{ cursor: dragging ? "grabbing" : "grab" }} 
              onMouseDown={handleMouseDown}
            >
              <span>{title}</span>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-red-500 text-sm px-2 py-0.5"
              >
                ✕
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- SIMPLE MODAL (Centré, pour confirmation/suppression) ---
export const ConfirmModal = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-4 text-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-lg font-bold text-red-600 mb-1">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};