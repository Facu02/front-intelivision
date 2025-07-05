import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList, IonBadge } from '@ionic/angular/standalone';
import { JsonPipe, DecimalPipe, NgIf, NgFor } from '@angular/common';
import { CameraService } from '../services/camera.service';
import { MediaPipeService } from '../services/mediapipe.service';
import { SensorData, PersonDetection, ObjectDetection } from '../models/sensor-data.model';
import { Subscription } from 'rxjs';
import { cameraReverse, camera, eye, eyeOff } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList, IonBadge, JsonPipe, DecimalPipe, NgIf, NgFor],
})
export class Tab1Page implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  
  isInitialized = false;
  isProcessing = false;
  currentSensorData: SensorData = {
    personas: [],
    objetos: [],
    timestamp: 0,
    cameraActive: false
  };
  
  private subscriptions: Subscription[] = [];
  private processingInterval: any;

  constructor(
    private cameraService: CameraService,
    private mediaPipeService: MediaPipeService
  ) {
    addIcons({
      cameraReverse,
      camera,
      eye,
      eyeOff
    });
  }

  ngOnInit() {
    // Suscribirse a los datos del sensor
    const sensorSubscription = this.mediaPipeService.getSensorData().subscribe(
      (data: SensorData) => {
        this.currentSensorData = data;
        this.logSensorData(data);
      }
    );
    
    this.subscriptions.push(sensorSubscription);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeVision();
    }, 500);
  }

  ngOnDestroy() {
    this.stopProcessing();
    this.cameraService.stopCamera();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async initializeVision() {
    try {
      console.log('Inicializando InteLeVision...');
      
      // Verificar que MediaPipe esté listo
      if (!this.mediaPipeService.isReady()) {
        console.log('Esperando MediaPipe...');
        setTimeout(() => this.initializeVision(), 1000);
        return;
      }

      // Inicializar cámara
      const cameraSuccess = await this.cameraService.initializeCamera(this.videoElement.nativeElement);
      
      if (cameraSuccess) {
        console.log('Cámara inicializada correctamente');
        this.isInitialized = true;
        this.startProcessing();
      } else {
        console.error('Error al inicializar cámara');
      }
    } catch (error) {
      console.error('Error inicializando InteLeVision:', error);
    }
  }

  startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Iniciando procesamiento de video...');
    
    // Procesar frames a 10 FPS para optimizar rendimiento
    this.processingInterval = setInterval(() => {
      if (this.videoElement && this.videoElement.nativeElement) {
        this.mediaPipeService.processFrame(this.videoElement.nativeElement);
      }
    }, 100); // 10 FPS
  }

  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
  }

  async switchCamera() {
    try {
      this.stopProcessing();
      const success = await this.cameraService.switchCamera();
      if (success) {
        setTimeout(() => this.startProcessing(), 500);
      }
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
    }
  }

  private logSensorData(data: SensorData) {
    // Log detallado para debugging
    if (data.personas.length > 0 || data.objetos.length > 0) {
      console.log('=== SENSOR DATA ===');
      console.log('Timestamp:', new Date(data.timestamp).toLocaleTimeString());
      console.log('Personas detectadas:', data.personas.length);
      console.log('Objetos detectados:', data.objetos.length);
      
      data.personas.forEach((persona, index) => {
        console.log(`Persona ${index + 1}:`, persona);
      });
      
      data.objetos.forEach((objeto, index) => {
        console.log(`Objeto ${index + 1}:`, objeto);
      });
      
      console.log('==================');
    }
  }

  // Métodos para el template
  getPersonasCount(): number {
    return this.currentSensorData.personas.length;
  }

  getObjetosCount(): number {
    return this.currentSensorData.objetos.length;
  }

  getLastUpdate(): string {
    if (this.currentSensorData.timestamp === 0) return 'Sin datos';
    return new Date(this.currentSensorData.timestamp).toLocaleTimeString();
  }

  getStatusColor(): string {
    if (!this.isInitialized) return 'medium';
    if (!this.isProcessing) return 'warning';
    return 'success';
  }

  getStatusText(): string {
    if (!this.isInitialized) return 'Inicializando...';
    if (!this.isProcessing) return 'Pausado';
    return 'Activo';
  }

  async checkCameraPermissions() {
    try {
      console.log('🔍 Diagnóstico de cámara para iOS...');
      
      // Detectar iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isHTTPS = location.protocol === 'https:';
      
      let message = '📱 Diagnóstico InteLeVision:\n\n';
      message += `🔗 URL actual: ${location.href}\n`;
      message += `📱 iOS detectado: ${isIOS ? 'Sí' : 'No'}\n`;
      message += `🔒 HTTPS activo: ${isHTTPS ? 'Sí' : 'No'}\n\n`;
      
      if (isIOS && !isHTTPS) {
        message += '⚠️ PROBLEMA: iOS requiere HTTPS\n';
        message += '✅ Solución: Cambia la URL a https://\n\n';
      }
      
      // Verificar disponibilidad de MediaDevices
      if (!navigator.mediaDevices) {
        message += '❌ MediaDevices no disponible\n';
      } else {
        message += '✅ MediaDevices disponible\n';
        
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter(d => d.kind === 'videoinput');
          message += `📹 Cámaras detectadas: ${cameras.length}\n`;
        } catch (e) {
          message += '❌ Error enumerando dispositivos\n';
        }
      }
      
      alert(message);
      
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      alert('❌ Error durante el diagnóstico: ' + error);
    }
  }
}
