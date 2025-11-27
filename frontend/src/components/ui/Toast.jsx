// src/components/ui/Toast.jsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
// Les icônes sont importées depuis le même répertoire ui
import { CheckCircleIcon, XCircleIcon } from "./Icons"; 

export const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[60] pointer-events-none">
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          layout
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded shadow-lg text-white text-sm font-medium min-w-[300px] ${
            toast.type === "error" ? "bg-red-500" : "bg-green-600"
          }`}
        >
          <div className="flex-shrink-0 text-lg">
            {toast.type === "error" ? <XCircleIcon /> : <CheckCircleIcon />}
          </div>
          <div className="flex-1">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-70 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);