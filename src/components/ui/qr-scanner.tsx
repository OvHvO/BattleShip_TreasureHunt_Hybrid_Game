// File path: src/components/ui/qr-scanner.tsx
"use client"

import { useEffect, useState, useRef } from "react"
// 👈 1. Import Html5Qrcode and CameraDevice, no longer using Html5QrcodeScanner
import { Html5Qrcode, CameraDevice } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { X, CheckCircle, Loader2 } from "lucide-react"

// Define component props interface
interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

// Scanner DOM element ID
const QR_READER_ID = "qr-reader-element";

export function QrScanner({ onScanSuccess, onClose }: QrScannerProps) {
  const [scanStatus, setScanStatus] = useState<"loading" | "success" | "error" | "idle">("loading");
  const [statusText, setStatusText] = useState("Requesting camera...");
  
  // Ref to hold the scanner instance for cleanup
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  
  // Ref for the 1.5 second buffer period
  const isScanningEnabled = useRef(false);

  useEffect(() => {
    // 1.5-second buffer period timer
    const enableScanTimer = setTimeout(() => {
      isScanningEnabled.current = true;
      console.log("✅ QR Scanning is now active (buffer period over).");
    }, 1500); // 1.5 second buffer

    if (typeof window === "undefined") {
      return;
    }

    // 👈 2. Create Html5Qrcode instance (no longer using Scanner)
    const html5QrCode = new Html5Qrcode(QR_READER_ID, false);
    html5QrCodeRef.current = html5QrCode; // Store for cleanup

    // Scanner config
    const config = {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
        return { width: size, height: size };
      },
    };

    // Scan success callback
    const handleSuccess = (decodedText: string) => {
      // Check buffer period
      if (!isScanningEnabled.current) {
        console.log("Scan detected, but ignored during buffer period.");
        return; 
      }
      
      setScanStatus("success");
      setStatusText("Scan Successful!");

      // 👈 3. Stop scanning (this is now required)
      html5QrCode.stop()
        .then(() => {
          console.log("Scanner stopped on success.");
        })
        .catch((err) => {
          console.error("Failed to stop scanner on success:", err);
        })
        .finally(() => {
          // Delay 500ms before calling parent's onScanSuccess
          setTimeout(() => {
            onScanSuccess(decodedText);
          }, 500);
        });
    };

    // Scan error callback
    const handleError = (errorMessage: string) => {
      // Ignore "No QR code found" error, this is normal
      if (errorMessage.includes("No QR code found")) {
        return;
      }
      // Report other errors
      console.error("QR Scanner Error:", errorMessage);
    };

    // 👈 4. [Core Logic] Get cameras and force use of back camera
    Html5Qrcode.getCameras()
      .then((cameras: CameraDevice[]) => {
        if (!cameras || cameras.length === 0) {
          setScanStatus("error");
          setStatusText("No cameras found on this device.");
          return;
        }

        let cameraId: string;

        // 💡 [Fixed] Find back camera by label
        const backCamera = cameras.find(
          (camera) => camera.label.toLowerCase().includes("back") ||
                       camera.label.toLowerCase().includes("rear") ||
                       camera.label.toLowerCase().includes("environment")
        );
        
        if (backCamera) {
          cameraId = backCamera.id;
          console.log(`Using back camera (by label): ${backCamera.label}`);
        } else {
          // If not found, use the first one in the list (usually the default camera)
          cameraId = cameras[0].id;
          console.warn(`Back camera not found by label. Using default camera: ${cameras[0].label}`);
        }

        // 👈 5. Start scanning with specific camera ID
        setScanStatus("idle");
        setStatusText("Point your camera at a QR code");

        html5QrCode.start(
          cameraId,     // Force use of this camera
          config,
          handleSuccess,
          handleError
        ).catch((err) => {
          console.error("Failed to start scanner:", err);
          setScanStatus("error");
          setStatusText("Failed to start camera. Check permissions.");
        });
      })
      .catch((err) => {
        console.error("Failed to get cameras:", err);
        setScanStatus("error");
        setStatusText("Could not access camera. Please check permissions.");
      });

    // 👈 6. Cleanup (very important)
    return () => {
      console.log("Cleaning up QR scanner...");
      clearTimeout(enableScanTimer);
      
      const scanner = html5QrCodeRef.current;
      if (scanner) {
        // Check if scanner is running, then stop it
        // scanner.getState() === 2 (SCANNING)
        try {
          if (scanner.getState() === 2) {
            scanner.stop()
              .then(() => console.log("Scanner stopped on unmount."))
              .catch((err) => console.error("Failed to stop scanner on unmount:", err));
          }
        } catch (error) {
          console.warn("Error checking scanner state on unmount:", error);
        }
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      {/* 1. Top bar (close button) */}
      <div className="flex w-full items-center justify-end p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white rounded-full hover:text-white hover:bg-white/10"
          aria-label="Close scanner"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* 2. Scanner viewport */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4">
        {/* This <div> is where the library mounts the <video> element.
          We no longer need extra UI like "qr-reader-element-scanner".
        */}
        <div 
          id={QR_READER_ID} 
          className="w-full max-w-md md:max-w-lg rounded-lg overflow-hidden"
        >
          {/* html5-qrcode library will inject <video> element here */}
        </div>

        {/* 3. Status indicator */}
        <div className="mt-4 flex items-center justify-center space-x-2 p-4 bg-black/30 rounded-lg">
          {scanStatus === "loading" && (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          )}
          {scanStatus === "success" && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          <p className="text-base font-medium text-white">{statusText}</p>
        </div>
      </div>
    </div>
  );
}