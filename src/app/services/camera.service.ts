import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isActive = new BehaviorSubject<boolean>(false);
  
  public readonly isActive$ = this.isActive.asObservable();

  constructor() { }

  async initializeCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      this.videoElement = videoElement;
      
      // Configuración compatible con iOS
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'environment',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      console.log('Solicitando permisos de cámara...');
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      
      return new Promise<boolean>((resolve) => {
        this.videoElement!.onloadedmetadata = () => {
          this.videoElement!.play();
          this.isActive.next(true);
          resolve(true);
        };
      });
    } catch (error: any) {
      console.error('Error al inicializar cámara:', error);
      
      // Manejo específico de errores para iOS
      if (error.name === 'NotAllowedError') {
        console.error('❌ Permisos de cámara denegados');
        alert('🔒 Permisos de cámara denegados. Ve a Configuración > Safari > Cámara y habilita el acceso.');
      } else if (error.name === 'NotFoundError') {
        console.error('❌ No se encontró cámara');
        alert('📱 No se encontró cámara en tu dispositivo');
      } else if (error.name === 'NotSupportedError') {
        console.error('❌ HTTPS requerido para iOS');
        alert('🔒 iOS requiere HTTPS. Usa https://tu-ip:8100 en lugar de http://');
      } else {
        console.error('❌ Error general:', error.message);
        alert('❌ Error al acceder a la cámara: ' + error.message);
      }
      
      this.isActive.next(false);
      return false;
    }
  }

  async switchCamera(): Promise<boolean> {
    if (!this.videoElement || !this.stream) return false;

    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      const currentFacingMode = videoTrack.getSettings().facingMode;
      
      this.stopCamera();
      
      const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: newFacingMode,
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      
      return new Promise<boolean>((resolve) => {
        this.videoElement!.onloadedmetadata = () => {
          this.videoElement!.play();
          this.isActive.next(true);
          resolve(true);
        };
      });
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      return false;
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    
    this.isActive.next(false);
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  captureFrame(): ImageData | null {
    if (!this.videoElement) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(this.videoElement, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
} 