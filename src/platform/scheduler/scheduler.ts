export interface Scheduler {
  autorizado(cabecalhos: Headers): boolean;
  executar<T>(nome: string, trabalho: () => Promise<T>): Promise<T>;
}
