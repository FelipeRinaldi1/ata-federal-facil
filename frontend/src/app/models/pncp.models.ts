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
  unidade_codigo?: string;
  codigo_unidade?: string;
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

export interface ItemCompraPncp {
  numeroItem: number;
  descricao: string;
  materialOuServico?: string;
  materialOuServicoNome?: string;
  valorUnitarioEstimado?: number;
  valorTotal?: number;
  quantidade?: number;
  unidadeMedida?: string;
  orcamentoSigiloso?: boolean;
  itemCategoriaNome?: string;
  criterioJulgamentoNome?: string;
  situacaoCompraItem?: number;
  situacaoCompraItemNome?: string;
  temResultado?: boolean;
  informacaoComplementar?: string;
  nomeRazaoSocialFornecedor?: string;
  niFornecedor?: string;
  valorUnitarioHomologado?: number;
  valorTotalHomologado?: number;
  quantidadeHomologada?: number;
}

export interface AtaPncpCompraDTO {
  numeroAtaRegistroPreco?: string;
  anoAta?: number;
  dataAssinatura?: string;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  dataCancelamento?: string | null;
  cancelado?: boolean;
  dataPublicacaoPncp?: string;
  sequencialAta?: number;
  numeroControlePNCP?: string;
  modalidadeNome?: string;
  objetoCompra?: string;
  informacaoComplementarCompra?: string;
  possibilidadeAdesao?: boolean | null;
  orgaoEntidade?: {
    cnpj?: string;
    razaoSocial?: string;
  };
}

export interface DetalheCompraPncp {
  numeroControlePNCP?: string;
  anoCompra: number;
  sequencialCompra: number;
  numeroCompra?: string;
  processo?: string;
  objetoCompra?: string;
  informacaoComplementar?: string;
  srp?: boolean;
  modalidadeId?: number;
  modalidadeNome?: string;
  modoDisputaNome?: string;
  tipoInstrumentoConvocatorioNome?: string;
  valorTotalEstimado?: number | null;
  valorTotalHomologado?: number | null;
  orcamentoSigilosoDescricao?: string;
  situacaoCompraNome?: string;
  dataPublicacaoPncp?: string;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
  linkSistemaOrigem?: string;
  linkProcessoEletronico?: string;
  usuarioNome?: string;
  orgaoEntidade?: {
    cnpj: string;
    razaoSocial: string;
    poderId?: string;
    esferaId?: string;
  };
  unidadeOrgao?: {
    ufSigla?: string;
    ufNome?: string;
    municipioNome?: string;
    codigoIbge?: string;
    codigoUnidade?: string;
    nomeUnidade?: string;
  };
  amparoLegal?: {
    nome?: string;
    descricao?: string;
    codigo?: number;
  };
}

export interface PncpSearchResponse {
  items: PncpAtaSearchItem[];
  total: number;
}

export interface ArquivoPublicacaoPncp {
  url: string;
  dataPublicacaoPncp?: string;
  sequencialDocumento?: number;
  titulo?: string;
  tipoDocumentoNome?: string;
  tipoDocumentoId?: number;
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
  rawItem?: PncpAtaSearchItem;
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
  uasg?: string;
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
  itensCarregados?: ItemCompraPncp[];
  carregandoItens?: boolean;
  itensCorrespondentes?: ItemCompraPncp[];
}

export interface ItemBuscaProfunda {
  numeroItem: number;
  descricao: string;
  quantidade?: number;
  unidadeMedida?: string;
  valorUnitarioEstimado?: number;
  valorTotal?: number;
  valorUnitarioHomologado?: number;
  valorTotalHomologado?: number;
  criterioJulgamentoNome?: string;
  situacaoCompraItemNome?: string;
  nomeFornecedor?: string;
  cnpj: string;
  cnpjFormatado: string;
  ano: number;
  seqCompra: string;
  nomeOrgao: string;
  uasg?: string;
  unidadeNome?: string;
  uf?: string;
  linkPregaoPncp: string;
}
