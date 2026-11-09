export interface PncpAtaSearchItem {
  id: string;
  title?: string;
  description?: string;
  item_url: string;
  document_type?: string;
  numero?: string | null;
  ano: string | number;
  numero_sequencial?: string | number;
  numero_sequencial_compra_ata?: string | number;
  numero_controle_pncp?: string;
  orgao_id?: string;
  orgao_cnpj?: string;
  orgao_nome?: string;
  orgao_subrogado_nome?: string;
  unidade_nome?: string;
  esfera_id?: string;
  esfera_nome?: string;
  poder_nome?: string;
  uf?: string;
  municipio_nome?: string;
  modalidade_licitacao_id?: string;
  modalidade_licitacao_nome?: string;
  situacao_nome?: string;
  data_publicacao_pncp?: string;
  data_assinatura?: string;
  data_inicio_vigencia?: string;
  data_fim_vigencia?: string;
  cancelado?: boolean;
  valor_global?: number | null;
  permite_adesao?: boolean | null;
  fornecedor_nome?: string | null;
  fornecedor_ni?: string | null;
}

export interface PncpSearchResponse {
  items: PncpAtaSearchItem[];
  total: number;
}

export interface AtaVinculada {
  id: string;
  titulo: string;
  numeroAta: string;
  ano: number;
  seqAta: string;
  urlAtaPncp: string;
  objeto: string;
  dataAssinatura?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  isVigente: boolean;
  diasRestantes?: number;
  statusVigencia: 'vigente' | 'prestes-a-vencer' | 'expirada' | 'desconhecido';
  permiteAdesao: boolean;
  fornecedorNome?: string;
  fornecedorNi?: string;
  valorTotal?: number;
}

export type CriterioOrdenacao = 
  | 'mais-atas' 
  | 'maior-vigencia' 
  | 'mais-recente' 
  | 'nao-vistos-primeiro' 
  | 'orgao-az';

export interface PregaoAgrupado {
  chavePregao: string; // ${cnpj}_${ano}_${seqCompra}
  cnpj: string;
  cnpjFormatado: string;
  ano: number;
  seqCompra: string;
  nomeOrgao: string;
  unidadeNome?: string;
  uf?: string;
  municipio?: string;
  esfera: string;
  modalidadeNome?: string;
  linkPregaoPncp: string;
  objetoResumido: string;
  dataPublicacao?: string;
  dataAssinatura?: string;
  maiorDiasVigencia?: number;
  totalAtas: number;
  totalAtasVigentes: number;
  atas: AtaVinculada[];
  atasFiltradas?: AtaVinculada[];
  statusAnalise?: 'pendente' | 'em-analise' | 'analisado';
  expandido?: boolean;
}
