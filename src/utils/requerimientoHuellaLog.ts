type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export enum HuellaAccionLogId {
  SOLICITAR_REQUERIMIENTO = 1,
  ASIGNAR_REQUERIMIENTO = 2,
  ACEPTAR_REQUERIMIENTO = 3,
  INICIAR_PROCESAMIENTO = 4,
  FINALIZAR_REQUERIMIENTO = 5,
  RECHAZAR_REQUERIMIENTO = 6,
  REASIGNAR_MESA = 7,
  ESCALAR_NIVEL_SUPERIOR = 8,
  ENVIAR_A_BRECHA = 9,
  CANCELAR_REQUERIMIENTO = 10,
}

export enum HuellaRequerimientoEstadoId {
  INICIADO = 1,
  ASIGNADO = 2,
  ACEPTADO = 3,
  EN_PROCESO = 4,
  FINALIZADO = 5,
  RECHAZADO = 6,
  REASIGNADO_A_MESA = 7,
  ESCALADO_SUPERIOR = 8,
  ENVIADO_A_BRECHA = 9,
  CANCELADO = 10,
}

export enum HuellaMotivoId {
  SIN_STOCK = 1,
  CAPACIDAD_INSUFICIENTE = 2,
  RECURSO_NO_CORRESPONDE = 3,
  MESA_NO_COMPETENTE = 4,
  SIN_MESA_DISPONIBLE = 5,
  SIN_RESPUESTA_COE_ACTUAL = 6,
  SIN_RESPUESTA_NIVEL_SUPERIOR = 7,
  SIN_RESPUESTA_NACIONAL = 8,
  REQUIERE_GESTION_INTERNACIONAL = 9,
  SOLICITUD_DUPLICADA = 10,
  SOLICITUD_CANCELADA = 11,
  ERROR_REGISTRO = 12,
}

export enum HuellaMovimientoTipoId {
  INTERNO_MISMO_COE = 1,
  REASIGNACION_MESA = 2,
  ESCALAMIENTO_SUPERIOR = 3,
  DERIVACION_BRECHA = 4,
  CIERRE_OPERATIVO = 5,
  CANCELACION = 6,
}

export interface HuellaLogPayload {
  cantidad_asignada: number;
  cantidad_solicitada: number;
  coe_destino_id: number;
  coe_origen_id: number;
  mesa_destino_id: number;
  mesa_origen_id: number;
  motivo_id: number;
  movimiento_tipo_id: number;
  recurso_grupo_id: number;
  recurso_inventario_id: number;
  recurso_tipo_id: number;
  requerimiento_accion_log_id: number;
  requerimiento_estado_id: number;
  requerimiento_numero: string;
  requerimiento_recurso_id: number;
  respuesta_estado_id: number;
  respuesta_fecha: string;
  secuencia: number;
  usuario_accion_id: number;
}

type HuellaDefaults = {
  estadoId: HuellaRequerimientoEstadoId;
  movimientoTipoId: HuellaMovimientoTipoId;
  motivoId: number;
};

const DEFAULTS_BY_ACCION: Record<HuellaAccionLogId, HuellaDefaults> = {
  [HuellaAccionLogId.SOLICITAR_REQUERIMIENTO]: {
    estadoId: HuellaRequerimientoEstadoId.INICIADO,
    movimientoTipoId: HuellaMovimientoTipoId.INTERNO_MISMO_COE,
    motivoId: 0,
  },
  [HuellaAccionLogId.ASIGNAR_REQUERIMIENTO]: {
    estadoId: HuellaRequerimientoEstadoId.ASIGNADO,
    movimientoTipoId: HuellaMovimientoTipoId.INTERNO_MISMO_COE,
    motivoId: 0,
  },
  [HuellaAccionLogId.ACEPTAR_REQUERIMIENTO]: {
    estadoId: HuellaRequerimientoEstadoId.ACEPTADO,
    movimientoTipoId: HuellaMovimientoTipoId.INTERNO_MISMO_COE,
    motivoId: 0,
  },
  [HuellaAccionLogId.INICIAR_PROCESAMIENTO]: {
    estadoId: HuellaRequerimientoEstadoId.EN_PROCESO,
    movimientoTipoId: HuellaMovimientoTipoId.INTERNO_MISMO_COE,
    motivoId: 0,
  },
  [HuellaAccionLogId.FINALIZAR_REQUERIMIENTO]: {
    estadoId: HuellaRequerimientoEstadoId.FINALIZADO,
    movimientoTipoId: HuellaMovimientoTipoId.CIERRE_OPERATIVO,
    motivoId: 0,
  },
  [HuellaAccionLogId.RECHAZAR_REQUERIMIENTO]: {
    estadoId: HuellaRequerimientoEstadoId.RECHAZADO,
    movimientoTipoId: HuellaMovimientoTipoId.CIERRE_OPERATIVO,
    motivoId: 0,
  },
  [HuellaAccionLogId.REASIGNAR_MESA]: {
    estadoId: HuellaRequerimientoEstadoId.REASIGNADO_A_MESA,
    movimientoTipoId: HuellaMovimientoTipoId.REASIGNACION_MESA,
    motivoId: 0,
  },
  [HuellaAccionLogId.ESCALAR_NIVEL_SUPERIOR]: {
    estadoId: HuellaRequerimientoEstadoId.ESCALADO_SUPERIOR,
    movimientoTipoId: HuellaMovimientoTipoId.ESCALAMIENTO_SUPERIOR,
    motivoId: 0,
  },
  [HuellaAccionLogId.ENVIAR_A_BRECHA]: {
    estadoId: HuellaRequerimientoEstadoId.ENVIADO_A_BRECHA,
    movimientoTipoId: HuellaMovimientoTipoId.DERIVACION_BRECHA,
    motivoId: HuellaMotivoId.REQUIERE_GESTION_INTERNACIONAL,
  },
  [HuellaAccionLogId.CANCELAR_REQUERIMIENTO]: {
    estadoId: HuellaRequerimientoEstadoId.CANCELADO,
    movimientoTipoId: HuellaMovimientoTipoId.CANCELACION,
    motivoId: 0,
  },
};

const secuenciaByKey = new Map<string, number>();

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nextSecuencia = (key: string, explicit?: number): number => {
  const explicitSecuencia = asNumber(explicit, 0);
  if (explicitSecuencia > 0) return explicitSecuencia;
  const current = asNumber(secuenciaByKey.get(key), 0);
  const next = current + 1;
  secuenciaByKey.set(key, next);
  return next;
};

export interface BuildHuellaLogPayloadParams {
  accionId: HuellaAccionLogId;
  usuarioAccionId: number;
  cantidadAsignada?: number;
  cantidadSolicitada?: number;
  coeDestinoId?: number;
  coeOrigenId?: number;
  mesaDestinoId?: number;
  mesaOrigenId?: number;
  motivoId?: number;
  movimientoTipoId?: number;
  recursoGrupoId?: number;
  recursoInventarioId?: number;
  recursoTipoId?: number;
  requerimientoEstadoId?: number;
  requerimientoNumero?: string;
  requerimientoRecursoId?: number;
  respuestaEstadoId?: number;
  respuestaFecha?: string;
  secuencia?: number;
}

export const buildHuellaLogPayload = (params: BuildHuellaLogPayloadParams): HuellaLogPayload => {
  const defaults = DEFAULTS_BY_ACCION[params.accionId];
  const requerimientoNumero = String(params.requerimientoNumero ?? '');
  const requerimientoRecursoId = asNumber(params.requerimientoRecursoId, 0);
  const sequenceKey =
    requerimientoNumero.trim().length > 0
      ? `num:${requerimientoNumero.trim()}`
      : `rr:${requerimientoRecursoId}`;

  return {
    cantidad_asignada: asNumber(params.cantidadAsignada, 0),
    cantidad_solicitada: asNumber(params.cantidadSolicitada, 0),
    coe_destino_id: asNumber(params.coeDestinoId, 0),
    coe_origen_id: asNumber(params.coeOrigenId, 0),
    mesa_destino_id: asNumber(params.mesaDestinoId, 0),
    mesa_origen_id: asNumber(params.mesaOrigenId, 0),
    motivo_id: asNumber(params.motivoId, defaults.motivoId),
    movimiento_tipo_id: asNumber(params.movimientoTipoId, defaults.movimientoTipoId),
    recurso_grupo_id: asNumber(params.recursoGrupoId, 0),
    recurso_inventario_id: asNumber(params.recursoInventarioId, 0),
    recurso_tipo_id: asNumber(params.recursoTipoId, 0),
    requerimiento_accion_log_id: asNumber(params.accionId, 0),
    requerimiento_estado_id: asNumber(params.requerimientoEstadoId, defaults.estadoId),
    requerimiento_numero: requerimientoNumero,
    requerimiento_recurso_id: requerimientoRecursoId,
    respuesta_estado_id: asNumber(params.respuestaEstadoId, 0),
    respuesta_fecha: String(params.respuestaFecha ?? new Date().toISOString()),
    secuencia: nextSecuencia(sequenceKey, params.secuencia),
    usuario_accion_id: asNumber(params.usuarioAccionId, 0),
  };
};

export const registrarHuellaLog = async ({
  apiBase,
  authFetch,
  payload,
  context,
}: {
  apiBase: string;
  authFetch: AuthFetch;
  payload: HuellaLogPayload;
  context: string;
}): Promise<void> => {
  try {
    const endpoint = `${apiBase}/requerimiento-huella-logs`;
    const res = await authFetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[HuellaLog] ${context}: HTTP ${res.status}`);
    }
  } catch (error) {
    console.error(`[HuellaLog] ${context}:`, error);
  }
};

export const registrarHuellaMovimiento = async ({
  apiBase,
  authFetch,
  context,
  params,
}: {
  apiBase: string;
  authFetch: AuthFetch;
  context: string;
  params: BuildHuellaLogPayloadParams;
}): Promise<void> => {
  const payload = buildHuellaLogPayload(params);
  await registrarHuellaLog({ apiBase, authFetch, payload, context });
};

