import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FilesetResolver, PoseLandmarker, FaceLandmarker, ObjectDetector } from '@mediapipe/tasks-vision';
import { SensorData, PersonDetection, ObjectDetection, MediaPipeResults } from '../models/sensor-data.model';

@Injectable({
  providedIn: 'root'
})
export class MediaPipeService {
  private poseLandmarker: PoseLandmarker | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private objectDetector: ObjectDetector | null = null;
  private isInitialized = false;
  private lastDetectionTime = 0;
  
  private sensorData = new BehaviorSubject<SensorData>({
    personas: [],
    objetos: [],
    timestamp: Date.now(),
    cameraActive: false
  });
  
  public readonly sensorData$ = this.sensorData.asObservable();

  constructor() {
    this.initializeMediaPipe();
  }

  private async initializeMediaPipe(): Promise<void> {
    try {
      console.log('🚀 Inicializando MediaPipe REAL...');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );

      // Inicializar detección de poses (REAL)
      console.log('📐 Cargando detector de poses...');
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 3,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Inicializar detección de rostros (REAL)
      console.log('😊 Cargando detector de rostros...');
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 3,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,    // ← ACTIVAR emociones de Google
        outputFacialTransformationMatrixes: true
      });

      // Inicializar detección de objetos (REAL)
      console.log('🎯 Cargando detector de objetos...');
      this.objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        scoreThreshold: 0.3,
        maxResults: 5
      });

      this.isInitialized = true;
      console.log('✅ MediaPipe REAL inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar MediaPipe:', error);
      this.isInitialized = false;
    }
  }

  async processFrame(video: HTMLVideoElement): Promise<void> {
    if (!this.isInitialized || !video || !this.poseLandmarker || !this.faceLandmarker || !this.objectDetector) {
      return;
    }

    try {
      const currentTime = performance.now();
      
      // Limitar procesamiento a 5 FPS para mejor rendimiento
      if (currentTime - this.lastDetectionTime < 200) {
        return;
      }
      this.lastDetectionTime = currentTime;

      const personas: PersonDetection[] = [];
      const objetos: ObjectDetection[] = [];

      // 🔍 DETECCIÓN REAL DE POSES Y ROSTROS
      const poseResults = this.poseLandmarker.detectForVideo(video, currentTime);
      const faceResults = this.faceLandmarker.detectForVideo(video, currentTime);

      // Procesar personas detectadas REALMENTE
      if (poseResults.landmarks && poseResults.landmarks.length > 0) {
        for (let i = 0; i < poseResults.landmarks.length; i++) {
          const landmarks = poseResults.landmarks[i];
          const worldLandmarks = poseResults.worldLandmarks?.[i];
          const faceMatch = faceResults.faceLandmarks?.[i];
          
          const persona: PersonDetection = {
            posicion: this.calculateRealPosition(landmarks),
            distancia: this.calculateRealDistance(landmarks, worldLandmarks),
            expresion: this.getGoogleExpression(faceResults, i),
            gesto: this.getGoogleGesture(landmarks),
            confianza: this.calculatePoseConfidence(landmarks),
            id: `persona_${i + 1}`
          };
          
          personas.push(persona);
        }
      }

      // 🎯 DETECCIÓN REAL DE OBJETOS
      const objectResults = this.objectDetector.detectForVideo(video, currentTime);
      
      if (objectResults.detections && objectResults.detections.length > 0) {
        for (let i = 0; i < objectResults.detections.length; i++) {
          const detection = objectResults.detections[i];
          const category = detection.categories[0];
          
          if (category && category.score > 0.3) {
            const objeto: ObjectDetection = {
              tipo: this.translateObjectName(category.categoryName),
              movimiento: this.analyzeRealMovement(detection),
              direccion: this.analyzeRealDirection(detection),
              velocidad: this.calculateRealSpeed(detection),
              distancia: this.calculateRealObjectDistance(detection),
              confianza: category.score,
              id: `objeto_${i + 1}`
            };
            
            objetos.push(objeto);
          }
        }
      }

      // Actualizar con datos REALES
      const newSensorData: SensorData = {
        personas,
        objetos,
        timestamp: Date.now(),
        cameraActive: true
      };

      this.sensorData.next(newSensorData);
      
      // Log solo cuando hay detecciones
      if (personas.length > 0 || objetos.length > 0) {
        console.log(`🔍 Detectado: ${personas.length} personas, ${objetos.length} objetos`);
      }
      
    } catch (error) {
      console.error('❌ Error procesando frame:', error);
    }
  }

  // ===== MÉTODOS REALES DE ANÁLISIS =====

  private calculateRealPosition(landmarks: any[]): string {
    if (!landmarks || landmarks.length === 0) return 'desconocido';
    
    // Usar nariz (landmark 0) para determinar posición
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // Centro de los hombros como referencia
    const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
    
    if (nose.x < shoulderCenter - 0.15) return 'izquierda';
    if (nose.x > shoulderCenter + 0.15) return 'derecha';
    return 'frente';
  }

  private calculateRealDistance(landmarks: any[], worldLandmarks?: any[]): string {
    if (!landmarks || landmarks.length === 0) return 'desconocido';
    
    // Usar distancia entre hombros para estimar distancia
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
    
    // Distancia estimada basada en tamaño de hombros en pantalla
    if (shoulderDistance > 0.25) return '0.8m';
    if (shoulderDistance > 0.15) return '1.2m';
    if (shoulderDistance > 0.10) return '1.8m';
    if (shoulderDistance > 0.05) return '2.5m';
    return '3.0m+';
  }

  private getGoogleExpression(faceResults: any, personIndex: number): string {
    try {
      // Usar directamente los BlendShapes de Google MediaPipe
      const blendshapes = faceResults.faceBlendshapes?.[personIndex];
      
      if (!blendshapes || !blendshapes.categories) {
        return 'no_detectada';
      }

      // Buscar las emociones más prominentes en los blendshapes
      const emotions: { [key: string]: number } = {};
      
      blendshapes.categories.forEach((category: any) => {
        const name = category.categoryName.toLowerCase();
        const score = category.score;
        
        // Mapear blendshapes a emociones
        if (name.includes('smile')) {
          emotions['feliz'] = (emotions['feliz'] || 0) + score;
        }
        if (name.includes('frown') || name.includes('sad')) {
          emotions['triste'] = (emotions['triste'] || 0) + score;
        }
        if (name.includes('surprise') || name.includes('brow')) {
          emotions['sorprendido'] = (emotions['sorprendido'] || 0) + score;
        }
        if (name.includes('angry') || name.includes('squint')) {
          emotions['enojado'] = (emotions['enojado'] || 0) + score;
        }
      });

      // Encontrar la emoción con mayor puntuación
      let maxEmotion = 'neutral';
      let maxScore = 0.15; // Threshold mínimo
      
      Object.entries(emotions).forEach(([emotion, score]) => {
        if (score > maxScore) {
          maxScore = score;
          maxEmotion = emotion;
        }
      });

      console.log(`🎭 Expresión detectada: ${maxEmotion} (${(maxScore * 100).toFixed(1)}%)`);
      return maxEmotion;
      
    } catch (error) {
      console.log('⚠️ Error obteniendo expresión de Google:', error);
      return 'neutral';
    }
  }

  private getGoogleGesture(landmarks: any[]): string {
    if (!landmarks || landmarks.length === 0) return 'ninguno';
    
    try {
      // Usar coordenadas reales pero con lógica más simple y descriptiva
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const nose = landmarks[0];
      
      // Detectar manos levantadas (gesto común)
      const leftHandUp = leftWrist.y < leftShoulder.y - 0.1;
      const rightHandUp = rightWrist.y < rightShoulder.y - 0.1;
      
      if (leftHandUp && rightHandUp) {
        return 'manos_arriba';
      }
      
      if (leftHandUp || rightHandUp) {
        return 'mano_levantada';
      }
      
      // Detectar brazos extendidos horizontalmente
      const leftArmExtended = Math.abs(leftWrist.y - leftShoulder.y) < 0.1 && 
                             Math.abs(leftWrist.x - leftShoulder.x) > 0.15;
      const rightArmExtended = Math.abs(rightWrist.y - rightShoulder.y) < 0.1 && 
                              Math.abs(rightWrist.x - rightShoulder.x) > 0.15;
      
      if (leftArmExtended || rightArmExtended) {
        return 'brazo_extendido';
      }
      
      // Detectar brazos junto al cuerpo (posición neutral)
      const leftArmDown = leftWrist.y > leftShoulder.y + 0.2;
      const rightArmDown = rightWrist.y > rightShoulder.y + 0.2;
      
      if (leftArmDown && rightArmDown) {
        return 'brazos_abajo';
      }

      console.log(`👋 Gesto detectado: posicion_detectada`);
      return 'posicion_detectada';
      
    } catch (error) {
      console.log('⚠️ Error obteniendo gesto:', error);
      return 'ninguno';
    }
  }

  private calculatePoseConfidence(landmarks: any[]): number {
    if (!landmarks || landmarks.length === 0) return 0;
    
    // Calcular confianza basada en visibilidad de puntos clave
    const keyPoints = [0, 11, 12, 15, 16]; // nariz, hombros, muñecas
    let visiblePoints = 0;
    
    keyPoints.forEach(index => {
      if (landmarks[index] && landmarks[index].visibility !== undefined) {
        if (landmarks[index].visibility > 0.5) visiblePoints++;
      } else {
        visiblePoints++; // Si no hay visibility, asumimos que es visible
      }
    });
    
    return (visiblePoints / keyPoints.length) * 0.9; // Máximo 90%
  }

  private translateObjectName(englishName: string): string {
    const translations: { [key: string]: string } = {
      'person': 'persona',
      'bicycle': 'bicicleta',
      'car': 'coche',
      'motorcycle': 'motocicleta',
      'bus': 'autobus',
      'truck': 'camion',
      'chair': 'silla',
      'table': 'mesa',
      'bottle': 'botella',
      'cup': 'taza',
      'phone': 'telefono',
      'laptop': 'laptop',
      'book': 'libro',
      'clock': 'reloj',
      'dog': 'perro',
      'cat': 'gato',
      'bird': 'pajaro'
    };
    
    return translations[englishName] || englishName;
  }

  private analyzeRealMovement(detection: any): string {
    // Para MVP, movimiento básico basado en posición
    if (!detection.boundingBox) return 'estatico';
    
    const box = detection.boundingBox;
    const centerX = box.originX + (box.width / 2);
    
    // Análisis simple basado en posición en frame
    if (centerX < 0.3) return 'se_acerca_izq';
    if (centerX > 0.7) return 'se_acerca_der';
    return 'estatico';
  }

  private analyzeRealDirection(detection: any): string {
    if (!detection.boundingBox) return 'centro';
    
    const box = detection.boundingBox;
    const centerX = box.originX + (box.width / 2);
    
    if (centerX < 0.33) return 'izquierda';
    if (centerX > 0.66) return 'derecha';
    return 'centro';
  }

  private calculateRealSpeed(detection: any): string {
    // Para MVP, velocidad estimada basada en tamaño del objeto
    if (!detection.boundingBox) return '0 m/s';
    
    const box = detection.boundingBox;
    const objectSize = box.width * box.height;
    
    if (objectSize > 0.1) return '0.5 m/s';
    if (objectSize > 0.05) return '1.0 m/s';
    return '1.5 m/s';
  }

  private calculateRealObjectDistance(detection: any): string {
    if (!detection.boundingBox) return 'desconocido';
    
    const box = detection.boundingBox;
    const objectSize = box.width * box.height;
    
    // Estimar distancia basada en tamaño del bounding box
    if (objectSize > 0.2) return '0.5m';
    if (objectSize > 0.1) return '1.0m';
    if (objectSize > 0.05) return '1.5m';
    if (objectSize > 0.02) return '2.0m';
    return '2.5m+';
  }

  getSensorData(): Observable<SensorData> {
    return this.sensorData$;
  }

  getCurrentSensorData(): SensorData {
    return this.sensorData.value;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
} 