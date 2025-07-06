export interface PersonDetection {
  posicion: string;
  distancia: string;
  expresion: string;
  gesto: string;
  confianza?: number;
  id?: string;
  blendshapes?: Array<{
    name: string;
    score: number;
  }>;
}

export interface ObjectDetection {
  tipo: string;
  movimiento: string;
  direccion: string;
  velocidad: string;
  distancia: string;
  confianza?: number;
  id?: string;
}

export interface SensorData {
  personas: PersonDetection[];
  objetos: ObjectDetection[];
  timestamp: number;
  cameraActive: boolean;
}

export interface MediaPipeResults {
  landmarks?: any[];
  detections?: any[];
  poses?: any[];
  hands?: any[];
  face?: any[];
} 