// API pública do módulo `prazos`.
export { TRIBUNAIS, buscarTribunal, type Tribunal } from "./dominio/calendario";
export {
  dataCivilEmSaoPaulo, diasEntre, ehDataCivil, formatarData, formatarDataComSemana, somarDias, type DataCivil,
} from "./dominio/datas";
