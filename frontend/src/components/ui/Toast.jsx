import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../context/ToastContext";

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 space-y-3 z-[9999]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className={`px-4 py-2 rounded shadow text-white text-sm ${
              toast.type === "error" ? "bg-red-600" : "bg-green-600"
            }`}
          >
            <div className="flex justify-between items-center gap-4">
              <span>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
