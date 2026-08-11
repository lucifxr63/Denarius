export type BusinessModel = 'pyme-tradicional' | 'startup-saas';

export type DiagnosticAnswer = 'pyme' | 'startup' | 'neutral';

export interface DiagnosticOption {
  value: DiagnosticAnswer;
  label: string;
  description: string;
}

export interface DiagnosticQuestion {
  id: string;
  title: string;
  help: string;
  options: readonly DiagnosticOption[];
}

export const BUSINESS_MODEL_QUESTIONS: readonly DiagnosticQuestion[] = [
  {
    id: 'revenue_model',
    title: '¿Cómo genera ingresos principalmente tu empresa?',
    help: 'Elige la opción que mejor representa el ingreso principal, aunque tengas fuentes secundarias.',
    options: [
      { value: 'startup', label: 'Suscripciones recurrentes', description: 'Planes mensuales o anuales de software o servicios digitales.' },
      { value: 'pyme', label: 'Ventas, proyectos o servicios', description: 'Facturas por productos, proyectos, horas o servicios profesionales.' },
      { value: 'neutral', label: 'Modelo mixto', description: 'Una combinación relevante de suscripciones y ventas puntuales.' },
    ],
  },
  {
    id: 'priority',
    title: '¿Qué decisión financiera necesitas tomar con más frecuencia?',
    help: 'Esto define qué indicadores deben aparecer primero en Denarius.',
    options: [
      { value: 'startup', label: 'Cuánto podemos crecer', description: 'Runway, burn, contratación, inversión y velocidad de crecimiento.' },
      { value: 'pyme', label: 'Cómo cumplir pagos', description: 'Cobranza, proveedores, impuestos, nómina y capital de trabajo.' },
      { value: 'neutral', label: 'Ambas por igual', description: 'Necesito controlar liquidez y financiar crecimiento.' },
    ],
  },
  {
    id: 'billing',
    title: '¿Cómo se comporta tu facturación?',
    help: 'Piensa en la mayor parte de los ingresos de los últimos meses.',
    options: [
      { value: 'startup', label: 'Predecible y recurrente', description: 'Los mismos clientes pagan planes periódicos.' },
      { value: 'pyme', label: 'Variable y por factura', description: 'Los montos y clientes cambian según ventas o proyectos.' },
      { value: 'neutral', label: 'Todavía no lo sabemos', description: 'Estamos comenzando o el patrón aún no es estable.' },
    ],
  },
  {
    id: 'operations',
    title: '¿Qué elementos pesan más en tu operación?',
    help: 'Selecciona el grupo que más influye en tu caja.',
    options: [
      { value: 'pyme', label: 'Facturas, inventario o proveedores', description: 'Cuentas por cobrar/pagar, compras, stock o impuestos.' },
      { value: 'startup', label: 'Equipo y adquisición de clientes', description: 'Nómina, tecnología, marketing y crecimiento del producto.' },
      { value: 'neutral', label: 'Operación liviana o mixta', description: 'Ningún grupo domina claramente.' },
    ],
  },
  {
    id: 'growth_metrics',
    title: '¿Usas métricas como MRR, churn, CAC o LTV?',
    help: 'No es necesario calcularlas perfectamente; importa si orientan tus decisiones.',
    options: [
      { value: 'startup', label: 'Sí, son centrales', description: 'Las revisamos para medir crecimiento y eficiencia.' },
      { value: 'pyme', label: 'No, usamos métricas de caja', description: 'Priorizamos margen, cobranza, pagos y liquidez.' },
      { value: 'neutral', label: 'Algunas, ocasionalmente', description: 'Estamos adoptándolas o solo aplican a una parte del negocio.' },
    ],
  },
  {
    id: 'funding',
    title: '¿Cómo planeas financiar los próximos 12 meses?',
    help: 'El origen del financiamiento cambia las alertas y escenarios recomendados.',
    options: [
      { value: 'startup', label: 'Inversión o capital de riesgo', description: 'Una ronda o aporte financiará crecimiento antes de rentabilidad.' },
      { value: 'pyme', label: 'Ventas, crédito o flujo propio', description: 'La operación y líneas de financiamiento sostienen el negocio.' },
      { value: 'neutral', label: 'Aún no está definido', description: 'Evaluamos varias alternativas.' },
    ],
  },
] as const;

export type DiagnosticAnswers = Record<string, DiagnosticAnswer>;

export interface DiagnosticResult {
  model: BusinessModel;
  confidence: 'high' | 'medium' | 'low';
  startupScore: number;
  pymeScore: number;
  reasons: string[];
}

export function diagnoseBusinessModel(answers: DiagnosticAnswers): DiagnosticResult {
  let startupScore = 0;
  let pymeScore = 0;
  const reasons: string[] = [];

  for (const question of BUSINESS_MODEL_QUESTIONS) {
    const answer = answers[question.id];
    if (answer === 'startup') startupScore += 1;
    if (answer === 'pyme') pymeScore += 1;
  }

  if (answers.revenue_model === 'startup') reasons.push('Tus ingresos se apoyan en suscripciones recurrentes.');
  if (answers.revenue_model === 'pyme') reasons.push('Tus ingresos dependen principalmente de ventas, proyectos o servicios facturados.');
  if (answers.priority === 'startup') reasons.push('Tu prioridad es administrar crecimiento, burn y runway.');
  if (answers.priority === 'pyme') reasons.push('Tu prioridad es coordinar cobros, pagos y capital de trabajo.');
  if (answers.growth_metrics === 'startup') reasons.push('MRR, churn, CAC o LTV forman parte de tus decisiones.');
  if (answers.operations === 'pyme') reasons.push('Facturas, proveedores o inventario tienen peso operativo.');

  const model: BusinessModel = startupScore > pymeScore ? 'startup-saas' : 'pyme-tradicional';
  const difference = Math.abs(startupScore - pymeScore);
  const confidence = difference >= 3 ? 'high' : difference >= 2 ? 'medium' : 'low';

  if (!reasons.length) reasons.push('Tus respuestas muestran un modelo mixto; comenzaremos con una vista que prioriza la liquidez.');
  return { model, confidence, startupScore, pymeScore, reasons: reasons.slice(0, 3) };
}
