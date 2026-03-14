import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onScan, onClose }) {
  useEffect(() => {
    // Initialize the scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Stop scanning after success
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        // Ignored, happens usually when no QR code is found yet
      }
    );

    // Cleanup on unmount
    return () => {
      scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner", error));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md p-6 bg-slate-800 border-slate-700 flex flex-col items-center relative">
        <h3 className="text-xl font-bold text-white mb-4">Scan QR Code</h3>
        <p className="text-slate-400 text-sm mb-6 text-center">Point your camera at a Product SKU barcode.</p>
        
        <div id="qr-reader" className="w-full max-w-[300px] overflow-hidden rounded-lg border-2 border-accent mb-6 bg-black"></div>
        
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
