'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// ÍCONES COMPLETOS
import { 
Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Settings, RefreshCw, AlertCircle, Tag, Lock, DollarSign, Barcode, Check
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO ---
function LoadingScreen() {
return (
  <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
    <h1 style={{ color: '#2f3640', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '32px', letterSpacing: '6px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
        Sincronizando Kanban <br /> <span style={{ fontSize: '40px', fontWeight:'300', color: '#718093' }}>Nova Tratores</span>
    </h1>
  </div>
)
}

// --- 2. FORMATADOR DE DATA ---
const formatarDataBR = (dataStr) => {
if (!dataStr || dataStr === 'null' || dataStr === "") return 'N/A';
try {
  const apenasData = dataStr.split(' ')[0];
  const partes = apenasData.split(/[-/]/);
  if (partes.length === 3) {
  if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`; 
  return `${partes[0]}/${partes[1]}/${partes[2]}`;
  }
  return dataStr;
} catch (e) { return dataStr; }
};

function GeometricBackground() {
return (
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f1f5f9', pointerEvents: 'none' }}>
  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 0% 0%, rgba(113, 128, 147, 0.08) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(47, 54, 64, 0.05) 0%, transparent 50%)' }}></div>
  </div>
)
}

// --- 3. CHAT INTERNO ---
function ChatChamado({ registroId, tipo, userProfile }) {
const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
const colunaId = tipo === 'boleto' ? 'chamado_id' : tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : 'rh_id';

useEffect(() => {
  if (!registroId || !userProfile?.id) return;
  const cleanId = String(registroId).includes('_p') ? registroId.split('_p')[0] : registroId;
  supabase.from('mensagens_chat').select('*').eq(colunaId, cleanId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
  const channel = supabase.channel(`chat_fin_k_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaId}=eq.${cleanId}` }, payload => { 
  if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
  }).subscribe();
  return () => { supabase.removeChannel(channel) }
}, [registroId, userProfile?.id, tipo, colunaId]);

const enviar = async (e) => {
  e.preventDefault(); if (!novaMsg.trim()) return;
  const texto = novaMsg; setNovaMsg('');
  const cleanId = String(registroId).includes('_p') ? registroId.split('_p')[0] : registroId;
  setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
  const insertData = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }; insertData[colunaId] = cleanId;
  await supabase.from('mensagens_chat').insert([insertData]);
}

return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #e0e0e0', borderRadius: '24px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 20px 50px rgba(79, 70, 229, 0.08)' }}>
  <div style={{ padding: '15px 25px', background: '#4f46e5', borderBottom: '1px solid #4338ca', fontWeight: '500', fontSize: '15px', color:'#ffffff', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
  <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {mensagens.map((m) => (
    <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#6366f115' : '#f8fafc', color: '#1e293b', padding: '14px 18px', borderRadius: '18px', maxWidth:'85%', border: '1px solid #e2e8f0' }}>
      <span style={{ fontSize: '15px', opacity: 0.6, display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontWeight: '700', color: '#4f46e5' }}>{m.usuario_nome?.toUpperCase()}</span>
      <span style={{ fontSize: '15px', lineHeight: '1.4' }}>{m.texto}</span>
    </div>
    ))}
  </div>
  <form onSubmit={enviar} style={{ padding: '20px', background: '#f8fafc', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0' }}>
    <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', outline: 'none', fontSize: '15px' }} />
    <button title="Enviar Mensagem" style={{ background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
  </form>
  </div>
)
}

// --- 4. COMPONENTE KANBAN PRINCIPAL ---
export default function KanbanFinanceiro() {
const [chamados, setChamados] = useState([]); const [userProfile, setUserProfile] = useState(null);
const [tarefaSelecionada, setTarefaSelecionada] = useState(null); const [loading, setLoading] = useState(true);
const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

const [filtroCliente, setFiltroCliente] = useState('');
const [filtroNF, setFiltroNF] = useState('');
const [filtroData, setFiltroData] = useState('');

const [fileBoleto, setFileBoleto] = useState(null);
const router = useRouter();

const colunas = [
  { id: 'gerar_boleto', titulo: 'GERAR BOLETO' },
  { id: 'enviar_cliente', titulo: 'ENVIAR PARA CLIENTE' },
  { id: 'aguardando_vencimento', titulo: 'AGUARDANDO VENCIMENTO' },
  { id: 'pago', titulo: 'PAGO' },
  { id: 'vencido', titulo: 'VENCIDO' }
];

const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (e) { console.error(e); }
};

const carregarDados = async () => {
  try {
    const { data } = await supabase.from('Chamado_NF').select('*');
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    // ─── AUTO-MOVE: gerar_boleto + boleto anexado → enviar_cliente ───────────
    const formasSemBoleto = ['Á Vista no Pix', 'Cartão a Vista', 'Cartão Parcelado'];
    const paraAutoMover = (data || []).filter(c =>
      (c.status === 'gerar_boleto' || c.status === 'validar_pix') &&
      c.anexo_boleto &&
      !formasSemBoleto.includes(c.forma_pagamento)
    );
    if (paraAutoMover.length > 0) {
      await Promise.all(paraAutoMover.map(c =>
        supabase.from('Chamado_NF').update({
          status: 'enviar_cliente',
          tarefa: 'Enviar para o Cliente',
          setor: 'Pós-Vendas'
        }).eq('id', c.id)
      ));
      // Atualiza o array local para refletir já sem nova busca
      paraAutoMover.forEach(c => {
        const idx = (data || []).findIndex(d => d.id === c.id);
        if (idx !== -1) data[idx] = { ...data[idx], status: 'enviar_cliente', tarefa: 'Enviar para o Cliente', setor: 'Pós-Vendas' };
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const processados = (data || []).map(c => {
      let st = c.status || 'gerar_boleto';
      const venc = c.vencimento_boleto ? new Date(c.vencimento_boleto) : null;
      if (venc) venc.setHours(0,0,0,0);
      const isParc = c.forma_pagamento?.toLowerCase().includes('parcelado');

      // Só auto-move para 'pago' se NÃO for parcelado (parcelado tem datas por parcela)
      if (st === 'aguardando_vencimento' && venc && venc < hoje && !isParc) st = 'pago';

      // Verifica se alguma parcela venceu sem comprovante (para alertar no Home Financeiro)
      let parcelaVencida = false;
      if (st === 'aguardando_vencimento' && isParc) {
        const qtd = c.qtd_parcelas || 1;
        const datas = [c.vencimento_boleto, ...(c.datas_parcelas || '').split(/[\s,]+/).filter(d => d.includes('-'))];
        for (let i = 0; i < qtd; i++) {
          const comprovante = i === 0 ? (c.comprovante_pagamento || c.comprovante_pagamento_p1) : c[`comprovante_pagamento_p${i + 1}`];
          const dataParc = datas[i] ? new Date(datas[i]) : null;
          if (dataParc) dataParc.setHours(0,0,0,0);
          if (dataParc && dataParc < hoje && !comprovante) { parcelaVencida = true; break; }
        }
      }

      // isPagamentoRealizado verifica todos os comprovantes de parcelas
      let isPagamentoRealizado = false;
      if (isParc) {
        const qtd = parseInt(c.qtd_parcelas || 1);
        let conferidos = 0;
        for (let i = 1; i <= qtd; i++) {
          if (i === 1 ? (c.comprovante_pagamento_p1 || c.comprovante_pagamento) : c[`comprovante_pagamento_p${i}`]) conferidos++;
        }
        isPagamentoRealizado = conferidos === qtd;
      } else {
        isPagamentoRealizado = !!(c.comprovante_pagamento || c.comprovante_pagamento_p1);
      }

      return {
        ...c,
        status: st,
        valor_exibicao: c.valor_servico,
        isPagamentoRealizado,
        parcelaVencida
      };
    });
    setChamados(processados);
    
    // SINCRONIZA O MODAL SE ESTIVER ABERTO
    if (tarefaSelecionada) {
        const itemAtualizado = processados.find(x => x.id === tarefaSelecionada.id);
        if (itemAtualizado) setTarefaSelecionada(itemAtualizado);
    }
  } catch (err) { console.error("Erro ao carregar dados:", err); }
}

useEffect(() => {
    const channel = supabase
      .channel('kanban_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(channel) };
}, [tarefaSelecionada?.id ? tarefaSelecionada.id : 'global']);

useEffect(() => {
    const init = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) return router.push('/login');
      const { data: prof, error: profError } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
      if (!profError) setUserProfile(prof);
      await carregarDados();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
    }; init();
}, [router]);

const handleUpdateField = async (id, field, value) => {
      if (tarefaSelecionada?.status === 'concluido') return;
      await supabase.from('Chamado_NF').update({ [field]: value }).eq('id', id);
      carregarDados();
};

const handleUpdateFileDirect = async (id, field, file) => {
      if(!file) return;
      try {
        const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
        
        let updateData = { [field]: linkData.publicUrl };

        if ((field === 'comprovante_pagamento' || field.startsWith('comprovante_pagamento_p')) && tarefaSelecionada?.status === 'aguardando_vencimento') {
          updateData.tarefa = 'Pagamento concluído';
        }
        
        await supabase.from('Chamado_NF').update(updateData).eq('id', id);
        
        // CORREÇÃO: Atualiza o modal imediatamente com o novo link
        if (tarefaSelecionada) {
            setTarefaSelecionada(prev => ({ ...prev, ...updateData }));
        }

        alert("Arquivo atualizado!");
        carregarDados();
      } catch (err) { alert("Erro: " + err.message); }
};

const handleActionMoveStatus = async (t, newStatus) => {
      const { error } = await supabase.from('Chamado_NF').update({ status: newStatus }).eq('id', t.id);
      if (!error) {
          alert(newStatus === 'concluido' ? "Card Concluído!" : "Card movido!");
          carregarDados();
      }
};

const handleActionCobrarCliente = async (t) => {
      const newVal = (t.recombrancas_qtd || 0) + 1;
      const { error } = await supabase.from('Chamado_NF').update({ 
          tarefa: 'Cobrar Cliente (Recobrança)', 
          recombrancas_qtd: newVal,
          setor: 'Pós-Vendas'
      }).eq('id', t.id);
      if (!error) {
          alert("Recobrança enviada ao Pós-Vendas!");
          setTarefaSelecionada(null);
          carregarDados();
      }
};

const handleActionPedirRecobranca = async (t, moverParaVencido = true) => {
    window.confirm("Deseja alterar o boleto?");
    const newVal = (t.recombrancas_qtd || 0) + 1;
    
    let updateData = { 
        tarefa: 'Cobrar Cliente (Recobrança)', 
        recombrancas_qtd: newVal,
        setor: 'Pós-Vendas'
    };
    
    if (moverParaVencido) updateData.status = 'vencido';

    const { error } = await supabase.from('Chamado_NF').update(updateData).eq('id', t.id);
    if (!error) {
        alert("Recobrança enviada ao Pós-Vendas!");
        carregarDados();
    }
};

const handleActionSomenteVencido = async (t) => {
    const { error } = await supabase.from('Chamado_NF').update({ status: 'vencido' }).eq('id', t.id);
    if (!error) {
        alert("Card movido para Vencido!");
        carregarDados();
    }
};

const handleGerarBoletoFaturamentoFinal = async (id, fileArg) => {
    const arquivo = fileArg || fileBoleto;
    if (!arquivo) return alert("Anexe o arquivo.");
    const path = `boletos/${Date.now()}-${arquivo.name}`;
    await supabase.storage.from('anexos').upload(path, arquivo);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);

    const updateData = {
        status: 'enviar_cliente',
        anexo_boleto: data.publicUrl,
        tarefa: 'Enviar para o Cliente',
        setor: 'Pós-Vendas'
    };

    await supabase.from('Chamado_NF').update(updateData).eq('id', id);
    setTarefaSelecionada(null); carregarDados();
};

const chamadosFiltrados = chamados.filter(c => {
      const matchCliente = c.nom_cliente?.toLowerCase().includes(filtroCliente.toLowerCase());
      const matchNF = !filtroNF || (String(c.num_nf_servico).includes(filtroNF) || String(c.num_nf_peca).includes(filtroNF));
      const matchData = filtroData ? c.vencimento_boleto === filtroData : true;
      return matchCliente && matchNF && matchData;
});

if (loading) return <LoadingScreen />

// --- LÓGICAS CONDICIONAIS ---
const isPixOuCartaoVista = tarefaSelecionada && ['Á Vista no Pix', 'Cartão a Vista', 'Cartão Parcelado'].includes(tarefaSelecionada.forma_pagamento);
const isParcelamentoOuBoleto30 = tarefaSelecionada && ['Boleto 30 Dias', 'Boleto Parcelado', 'Cartão Parcelado'].includes(tarefaSelecionada.forma_pagamento);
const isBoleto30 = tarefaSelecionada && tarefaSelecionada.forma_pagamento === 'Boleto 30 Dias';
const isParceladoBoleto = tarefaSelecionada?.forma_pagamento?.toLowerCase().includes('parcelado');

const valorIndividual = tarefaSelecionada ? (tarefaSelecionada.valor_servico / (tarefaSelecionada.qtd_parcelas || 1)).toFixed(2) : 0;

// --- LÓGICA DE VENCIMENTO PARCELADO ---
const checkVencimentoParcelado = () => {
    if(!tarefaSelecionada || !isParceladoBoleto) return { vencido: false, moveParaVencido: false, apenasUma: false };
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const qtd = tarefaSelecionada.qtd_parcelas || 1;
    const datas = [tarefaSelecionada.vencimento_boleto, ...(tarefaSelecionada.datas_parcelas || "").split(/[\s,]+/).filter(d => d.includes('-'))];
    const pagas = [tarefaSelecionada.status_p1 === 'pago', tarefaSelecionada.status_p2 === 'pago', tarefaSelecionada.status_p3 === 'pago', tarefaSelecionada.status_p4 === 'pago', tarefaSelecionada.status_p5 === 'pago'];
    
    let vencidasIndices = [];
    datas.forEach((d, i) => {
        if (i < qtd && d) {
            const dt = new Date(d); dt.setHours(0,0,0,0);
            if(dt < hoje && !pagas[i]) vencidasIndices.push(i);
        }
    });

    const totalPagasCount = pagas.filter((p, i) => i < qtd && p).length;
    // Condição crítica: Todas vencidas OU (Todas anteriores pagas e última vencida)
    const moveParaVencido = (vencidasIndices.length === qtd) || (totalPagasCount === (qtd - 1) && vencidasIndices.includes(qtd - 1));
    const apenasUma = vencidasIndices.length > 0 && !moveParaVencido;

    return { vencido: vencidasIndices.length > 0, moveParaVencido, apenasUma };
};

const statusVencimento = checkVencimentoParcelado();

return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Montserrat, sans-serif', background: '#f8fafc', overflow: 'hidden' }}>
    <GeometricBackground />
    <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/kanban-financeiro" router={router} handleLogout={handleLogout} userProfile={userProfile} />

    <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, display: 'flex', flexDirection: 'column', transition: '0.4s ease', height: '100vh', overflow: 'hidden' }}>
      <header style={{ padding: '60px 50px 30px 50px' }}>
      <div style={{ display:'flex', gap:'20px', alignItems:'center', justifyContent: 'flex-start', marginBottom: '35px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
              <Search size={18} style={iconFilterStyle} title="Pesquisar por nome do cliente" />
              <input type="text" placeholder="Filtrar por Cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={inputFilterStyle} />
          </div>
          <div style={{ position: 'relative', width: '180px' }}>
              <Hash size={18} style={iconFilterStyle} title="Filtrar por número da nota" />
              <input type="text" placeholder="Nº Nota..." value={filtroNF} onChange={e => setFiltroNF(e.target.value)} style={inputFilterStyle} />
          </div>
          <div style={{ position: 'relative', width: '220px' }}>
              <Calendar size={18} style={iconFilterStyle} title="Filtrar por data de vencimento" />
              <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={inputFilterStyle} />
              {filtroData && <X size={14} onClick={() => setFiltroData('')} style={{position:'absolute', right: '12px', top: '50%', transform:'translateY(-50%)', cursor:'pointer', color:'#718093'}} title="Limpar filtro de data" />}
          </div>
      </div>
      <h1 style={{ fontWeight: '300', fontSize:'64px', color:'#2f3640', letterSpacing:'-4px', margin: 0 }}>Fluxo Financeiro</h1>
      <div style={{ width: '120px', height: '2px', background: '#718093', marginTop: '15px' }}></div>
      </header>

      <div style={{ flex: 1, display: 'flex', gap: '30px', overflowX: 'auto', overflowY: 'hidden', padding: '0 50px 40px 50px', boxSizing: 'border-box' }}>
      {colunas.map(col => (
        <div key={col.id} style={{ minWidth: '420px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={colTitleStyle}>{col.titulo}</h3>
        
        <div style={colWrapperStyle}>
          {chamadosFiltrados.filter(c => {
              if (col.id === 'pago') return (c.status === 'pago' || c.status === 'concluido');
              if (col.id === 'gerar_boleto') return (c.status === 'gerar_boleto' || c.status === 'validar_pix');
              return c.status === col.id;
          }).map((t, idx) => (
          <div key={`${t.id}-${idx}`} className="kanban-card" style={{ opacity: t.status === 'concluido' ? 0.6 : 1 }}>
            <div onClick={() => setTarefaSelecionada(t)} style={{ 
              background: t.status === 'vencido' ? 'rgba(239, 68, 68, 0.05)' : (t.status === 'pago' || t.status === 'concluido' ? 'rgba(34, 197, 94, 0.05)' : '#ffffff'), 
              padding: '25px', borderBottom: '1px solid #dcdde1', cursor: 'pointer'
            }}>
              <h4 style={{ margin: 0, fontSize: '22px', fontWeight: '400', color: t.status === 'vencido' ? '#c0392b' : (t.status === 'pago' || t.status === 'concluido' ? '#27ae60' : '#2f3640') }}>
              {t.nom_cliente?.toUpperCase()} {t.status === 'concluido' && "✓"}
              </h4>
              {t.isPagamentoRealizado && (
                  <div style={{marginTop: '10px', display:'flex', alignItems:'center', gap:'8px', color: '#27ae60', fontSize: '15px', fontWeight: '600'}} title="Comprovante de pagamento anexado">
                      <CheckCircle size={16} /> PAGAMENTO REALIZADO
                  </div>
              )}
              {t.parcelaVencida && !t.isPagamentoRealizado && (
                  <div style={{marginTop: '10px', display:'flex', alignItems:'center', gap:'8px', color: '#ef4444', fontSize: '13px', fontWeight: '700', background: '#fee2e2', padding: '6px 12px', borderRadius: '8px'}} title="Uma ou mais parcelas venceram sem comprovante">
                      <AlertCircle size={14} /> PARCELA VENCIDA SEM COMPROVANTE
                  </div>
              )}
              {t.anexo_boleto && (t.status === 'gerar_boleto' || t.status === 'validar_pix') && (
                  <div style={{marginTop: '10px', display:'flex', alignItems:'center', gap:'8px', color: '#4f46e5', fontSize: '15px', fontWeight: '600'}}>
                    <FileText size={16} /> BOLETO ANEXADO
                  </div>
              )}
            </div>
            <div onClick={() => setTarefaSelecionada(t)} style={{ padding: '25px', background:'transparent', cursor: 'pointer' }}>
              <div style={cardInfoStyle}><CreditCard size={16}/> <span>FORMA:</span> {t.forma_pagamento?.toUpperCase()}</div>
              <div style={cardInfoStyle}><Calendar size={16}/> <span>VENC:</span> {formatarDataBR(t.vencimento_boleto)}</div>
              <div style={{fontSize:'32px', fontWeight:'300', margin:'15px 0', color:'#2f3640'}}>R$ {t.valor_exibicao}</div>
              <div style={highlightIdStyle}>ID: #{t.id}</div>
            </div>
          </div>
          ))}
        </div>
        </div>
      ))}
      </div>
    </main>

    {/* --- MODAL DETALHES --- */}
    {tarefaSelecionada && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(245, 246, 250, 0.4)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '0px', display: 'flex', overflow:'hidden', boxShadow: '0 40px 100px rgba(47, 54, 64, 0.1)', border: '1px solid #dcdde1' }}>
        
        <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto' }}>
          <button onClick={() => setTarefaSelecionada(null)} className="btn-back" title="Voltar para a visualização do quadro"><ArrowLeft size={18}/> VOLTAR AO PAINEL</button>
          
          <h2 style={{fontSize:'32px', fontWeight:'400', margin:'30px 0', letterSpacing:'-1px', color:'#2f3640', lineHeight: '1.1'}}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
          
          <div style={{display:'flex', gap:'30px', marginBottom:'50px'}}>
            <div style={fieldBoxModal}>
              <label style={labelModalStyle}>Condição</label>
              <select 
                style={{...inputStyleModal, border: 'none', background: 'transparent', padding: '0', fontSize: '24px'}}
                value={tarefaSelecionada.forma_pagamento}
                disabled={tarefaSelecionada.status === 'concluido'}
                onChange={e => {
                    const val = e.target.value;
                    handleUpdateField(tarefaSelecionada.id, 'forma_pagamento', val);
                    if (val === 'Boleto 30 Dias') handleUpdateField(tarefaSelecionada.id, 'qtd_parcelas', 1);
                }}
              >
                <option value="Á Vista no Pix">Á Vista no Pix</option>
                <option value="Boleto 30 Dias">Boleto 30 Dias</option>
                <option value="Boleto Parcelado">Boleto Parcelado</option>
                <option value="Cartão a Vista">Cartão a Vista</option>
                <option value="Cartão Parcelado">Cartão Parcelado</option>
              </select>
            </div>
            <div style={fieldBoxModal}>
              <label style={labelModalStyle}>Valor Total</label>
              <input 
                  type="number"
                  style={{...inputStyleModal, border: 'none', background: 'transparent', padding: '0', fontSize: '32px', fontWeight: '400'}}
                  defaultValue={tarefaSelecionada.valor_servico}
                  onBlur={e => handleUpdateField(tarefaSelecionada.id, 'valor_servico', e.target.value)}
              />
            </div>
            
            {tarefaSelecionada.forma_pagamento !== 'Boleto Parcelado' && (
              <div style={fieldBoxModal}>
                <label style={labelModalStyle}>Data de Vencimento</label>
                <input 
                    type="date"
                    style={{...inputStyleModal, border: 'none', background: 'transparent', padding: '0', fontSize: '32px', fontWeight: '400', color: tarefaSelecionada.status === 'vencido' ? '#c0392b' : '#2f3640'}}
                    defaultValue={tarefaSelecionada.vencimento_boleto}
                    onBlur={e => handleUpdateField(tarefaSelecionada.id, 'vencimento_boleto', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* --- SEÇÃO DE PARCELAMENTO --- */}
          {isParcelamentoOuBoleto30 && !isBoleto30 && (
            <div style={{display:'flex', flexDirection: 'column', gap:'20px', marginBottom:'50px', background: 'rgba(245, 246, 250, 0.5)', padding: '40px', border: '1px solid #dcdde1'}}>
                <div style={{display: 'flex', gap: '30px', borderBottom: '1px solid #dcdde1', paddingBottom: '20px', marginBottom: '10px'}}>
                  <div style={{flex: 1}}>
                      <label style={labelModalStyle}>Qtd. Parcelas</label>
                      <select 
                        style={{...inputStyleModal, fontSize: '24px'}}
                        value={tarefaSelecionada.qtd_parcelas || 1}
                        disabled={tarefaSelecionada.status === 'concluido'}
                        onChange={e => handleUpdateField(tarefaSelecionada.id, 'qtd_parcelas', parseInt(e.target.value))}
                      >
                        <option value="1">1 Parcela</option>
                        {[2,3,4,5].map(v => <option key={v} value={v}>{v} Parcelas</option>)}
                      </select>
                  </div>
                  <div style={{flex: 1}}>
                      <label style={labelModalStyle}>Cálculo Unitário</label>
                      <div style={{...inputStyleModal, background: '#f8fafc', color: '#718093', borderStyle: 'dashed'}}>R$ {valorIndividual}</div>
                  </div>
                </div>

                {tarefaSelecionada.forma_pagamento === 'Boleto Parcelado' && (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      {/* PARCELA 1 */}
                      <div style={{display: 'grid', gridTemplateColumns: '60px 150px 220px 150px 320px', gap: '20px', alignItems: 'center', background: '#ffffff', padding: '15px', border: '1px solid #e2e8f0'}}>
                          <input 
                            type="checkbox" 
                            style={{width:'25px', height:'25px', cursor:'pointer'}}
                            checked={tarefaSelecionada.status_p1 === 'pago'} 
                            onChange={e => handleUpdateField(tarefaSelecionada.id, 'status_p1', e.target.checked ? 'pago' : 'pendente')}
                          />
                          <span style={{...labelModalStyle, marginBottom: 0, fontWeight: '700'}}>1ª PARC</span>
                          <input 
                            type="date"
                            style={{...inputStyleModal, fontSize: '16px', padding: '10px'}}
                            defaultValue={tarefaSelecionada.vencimento_boleto}
                            disabled={tarefaSelecionada.status === 'concluido'}
                            onBlur={e => handleUpdateField(tarefaSelecionada.id, 'vencimento_boleto', e.target.value)}
                          />
                          <span style={{fontSize: '18px', color: '#2f3640', fontWeight: '500'}}>R$ {valorIndividual}</span>
                          <AttachmentTag 
                            icon={<CheckCircle size={16} />} 
                            label="Comprovante" 
                            fileUrl={tarefaSelecionada.comprovante_pagamento_p1 || tarefaSelecionada.comprovante_pagamento} 
                            onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'comprovante_pagamento_p1', file)} 
                            disabled={tarefaSelecionada.status === 'concluido'} 
                          />
                      </div>

                      {/* PARCELAS 2 A 5 */}
                      {Array.from({ length: Math.min((tarefaSelecionada.qtd_parcelas || 1) - 1, 4) }).map((_, idx) => {
                          const num = idx + 2;
                          const currentDatesArr = (tarefaSelecionada.datas_parcelas || "").split(/[\s,]+/).filter(d => d.includes('-'));
                          return (
                              <div key={idx} style={{display: 'grid', gridTemplateColumns: '60px 150px 220px 150px 320px', gap: '20px', alignItems: 'center', background: '#ffffff', padding: '15px', border: '1px solid #e2e8f0'}}>
                                <input 
                                    type="checkbox" 
                                    style={{width:'25px', height:'25px', cursor:'pointer'}}
                                    checked={tarefaSelecionada[`status_p${num}`] === 'pago'} 
                                    onChange={e => handleUpdateField(tarefaSelecionada.id, `status_p${num}`, e.target.checked ? 'pago' : 'pendente')}
                                />
                                <span style={{...labelModalStyle, marginBottom: 0, fontWeight: '700'}}>{num}ª PARC</span>
                                <input 
                                  type="date"
                                  style={{...inputStyleModal, fontSize: '16px', padding: '10px'}}
                                  defaultValue={currentDatesArr[idx] || ''}
                                  disabled={tarefaSelecionada.status === 'concluido'}
                                  onBlur={e => {
                                      let newDatesArr = [...currentDatesArr];
                                      while(newDatesArr.length < 4) newDatesArr.push("");
                                      newDatesArr[idx] = e.target.value;
                                      handleUpdateField(tarefaSelecionada.id, 'datas_parcelas', newDatesArr.filter(d => d).join(', '));
                                  }}
                                />
                                <span style={{fontSize: '18px', color: '#2f3640', fontWeight: '500'}}>R$ {valorIndividual}</span>
                                <AttachmentTag 
                                  icon={<CheckCircle size={16} />} 
                                  label="Comprovante" 
                                  fileUrl={tarefaSelecionada[`comprovante_pagamento_p${num}`]} 
                                  onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, `comprovante_pagamento_p${num}`, file)} 
                                  disabled={tarefaSelecionada.status === 'concluido'} 
                                />
                              </div>
                          );
                      })}
                  </div>
                )}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px', background:'rgba(245, 246, 250, 0.5)', padding:'50px', borderRadius:'0px', border:'1px solid #dcdde1' }}>
            <div style={fieldBoxInner}>
              <label style={labelModalStyle}>Nota de Serviço</label>
              <input style={inputStyleModal} disabled={tarefaSelecionada.status === 'concluido'} defaultValue={tarefaSelecionada.num_nf_servico} placeholder="N/A" onBlur={e => handleUpdateField(tarefaSelecionada.id, 'num_nf_servico', e.target.value)} />
            </div>
            <div style={fieldBoxInner}>
              <label style={labelModalStyle}>Nota de Peça</label>
              <input style={inputStyleModal} disabled={tarefaSelecionada.status === 'concluido'} defaultValue={tarefaSelecionada.num_nf_peca} placeholder="N/A" onBlur={e => handleUpdateField(tarefaSelecionada.id, 'num_nf_peca', e.target.value)} />
            </div>
            <div style={{gridColumn:'span 2', ...fieldBoxInner}}>
              <label style={labelModalStyle}>Observações Financeiras</label>
              <textarea style={{...inputStyleModal, height:'120px', resize: 'none'}} disabled={tarefaSelecionada.status === 'concluido'} defaultValue={tarefaSelecionada.obs} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'obs', e.target.value)} />
            </div>
          </div>

          <div style={{marginTop:'50px'}}>
              <label style={labelModalStyle}>Arquivos do Chamado</label>
              <div style={{display:'flex', gap:'15px', flexWrap:'wrap', marginTop:'15px'}}>
                  <AttachmentTag icon={<FileText size={18} />} label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_nf_servico', file)} disabled={tarefaSelecionada.status === 'concluido'} />
                  <AttachmentTag icon={<ClipboardList size={18} />} label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_nf_peca', file)} disabled={tarefaSelecionada.status === 'concluido'} />
                  <AttachmentTag icon={<Barcode size={18} />} label="BOLETO" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'anexo_boleto', file)} disabled={true} />
                  
                  {(isPixOuCartaoVista || tarefaSelecionada.status === 'aguardando_vencimento' || tarefaSelecionada.comprovante_pagamento) && (
                    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '4px', background: 'rgba(39, 174, 96, 0.05)' }}>
                      <AttachmentTag icon={<CheckCircle size={18} />} label="COMPROVANTE GERAL" fileUrl={tarefaSelecionada.comprovante_pagamento} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id, 'comprovante_pagamento', file)} disabled={tarefaSelecionada.status === 'concluido'} />
                    </div>
                  )}
              </div>
          </div>

          <div style={{marginTop:'60px', display:'flex', gap:'20px'}}>
              {/* BLOCO DE PROCESSAMENTO */}
              {(tarefaSelecionada.status === 'gerar_boleto' || tarefaSelecionada.status === 'validar_pix') && !isPixOuCartaoVista && (
                <div style={{flex: 1, background:'rgba(79, 70, 229, 0.03)', padding:'40px', borderRadius:'24px', border:'2px dashed #4f46e5'}}>
                    <label style={{...labelModalStyle, color:'#4f46e5', fontSize: '15px', fontWeight:'700'}}>ANEXAR BOLETO FINAL E PROCESSAR</label>
                    <div style={{display:'flex', gap:'30px', marginTop:'25px', alignItems: 'center'}}>
                      <div style={{flex: 1, position: 'relative'}}>
                          <input
                            type="file"
                            id="file_boleto_input"
                            onChange={e => {
                              const file = e.target.files[0];
                              if (!file) return;
                              setFileBoleto(file);
                              // Dispara automaticamente ao selecionar o arquivo
                              handleGerarBoletoFaturamentoFinal(tarefaSelecionada.id, file);
                            }}
                            style={{display:'none'}}
                          />
                          <label htmlFor="file_boleto_input" style={{
                              display:'flex', alignItems:'center', gap:'10px', background:'#ffffff', border:'1px solid #dcdde1', padding:'15px 20px', borderRadius:'12px', cursor:'pointer', color:'#718093', fontSize:'14px'
                          }}>
                             <Upload size={18} /> {fileBoleto ? fileBoleto.name : "Selecionar boleto — tarefa gerada automaticamente"}
                          </label>
                      </div>
                      {/* Botão manual mantido como fallback */}
                      {fileBoleto && (
                        <button
                          onClick={() => handleGerarBoletoFaturamentoFinal(tarefaSelecionada.id)}
                          style={{
                            background:'#4f46e5',
                            color:'#ffffff',
                            padding:'18px 40px',
                            border:'none',
                            borderRadius:'50px',
                            cursor:'pointer',
                            fontSize: '14px',
                            textTransform:'uppercase',
                            letterSpacing:'2px',
                            fontWeight:'700',
                            boxShadow: '0 10px 20px rgba(79, 70, 229, 0.2)',
                            transition:'0.3s'
                          }}
                        >
                          GERAR TAREFA
                        </button>
                      )}
                    </div>
                </div>
              )}

              {/* BOTÕES DE AÇÃO DINÂMICOS PARA PARCELADO (QUANDO APENAS UMA VENCE) */}
              {tarefaSelecionada.status === 'aguardando_vencimento' && isParceladoBoleto && statusVencimento.apenasUma && (
                  <>
                    <button onClick={() => handleActionPedirRecobranca(tarefaSelecionada, false)} style={btnActionBlue}>
                        <DollarSign size={20}/> GERAR TAREFA: POS VENDAS RECOBRAR
                    </button>
                    <button onClick={() => handleUpdateField(tarefaSelecionada.id, 'tarefa', 'Conferido/Visto')} style={btnActionGreen}>
                        <CheckCheck size={20}/> MARCADO COMO VISTO
                    </button>
                  </>
              )}

              {/* MOVER PARA VENCIDO APENAS SE CONDIÇÃO CRÍTICA FOR ATENDIDA */}
              {tarefaSelecionada.status === 'aguardando_vencimento' && (!isParceladoBoleto || statusVencimento.moveParaVencido) && (
                  <>
                    <button onClick={() => handleActionPedirRecobranca(tarefaSelecionada, true)} style={btnActionBlue}>
                        <DollarSign size={20}/> PEDIR PARA POS VENDAS RECOBRAR
                    </button>
                    <button onClick={() => handleActionSomenteVencido(tarefaSelecionada)} style={btnActionRed}>
                        <AlertCircle size={20}/> MUDAR CARD PARA VENCIDO
                    </button>
                  </>
              )}

              {/* BOTÃO MOVE PARA PAGO (PARA PIX/CARTÃO OU BOLETO À VISTA) */}
              {((tarefaSelecionada.status === 'aguardando_vencimento' && !isParceladoBoleto && (tarefaSelecionada.comprovante_pagamento || tarefaSelecionada.comprovante_pagamento_p1 || isBoleto30)) || 
                 (isPixOuCartaoVista && tarefaSelecionada.comprovante_pagamento)) && tarefaSelecionada.status !== 'pago' && tarefaSelecionada.status !== 'concluido' && (
                <button onClick={() => handleActionMoveStatus(tarefaSelecionada, 'pago')} style={btnActionGreen}>
                    <CheckCheck size={20}/> MOVE PARA PAGO
                </button>
              )}

              {tarefaSelecionada.status === 'pago' && (
                <>
                    <button onClick={() => { if(window.confirm("Mover para VENCIDO?")) handleActionMoveStatus(tarefaSelecionada, 'vencido') }} style={btnActionRed}>
                        <AlertCircle size={20}/> MOVER PARA VENCIDO
                    </button>
                    <button onClick={() => { if(window.confirm("Deseja concluir este card?")) handleActionMoveStatus(tarefaSelecionada, 'concluido') }} style={btnActionGreen}>
                        <CheckCheck size={20}/> CONCLUIR PROCESSO
                    </button>
                </>
              )}

              {tarefaSelecionada.status === 'vencido' && (
                <>
                    <button onClick={() => handleActionCobrarCliente(tarefaSelecionada)} style={btnActionBlue}>
                        <DollarSign size={20}/> NOTIFICAR PÓS-VENDAS
                    </button>
                    <button onClick={() => { if(window.confirm("Confirmar Pagamento?")) handleActionMoveStatus(tarefaSelecionada, 'concluido') }} style={btnActionGreen}>
                        <CheckCircle size={20}/> CONFIRMAR PAGAMENTO
                    </button>
                </>
              )}

              {tarefaSelecionada.status === 'concluido' && (
                <div style={{flex: 1, background:'rgba(39, 174, 96, 0.05)', padding:'30px', borderRadius:'0px', border:'1px solid #27ae60', textAlign:'center'}}>
                    <span style={{color:'#27ae60', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', textTransform:'uppercase', letterSpacing:'3px'}}><Lock size={18}/> Processo Finalizado</span>
                </div>
              )}
            </div>
        </div>

        <div style={{ flex: '0.8', padding: '40px', background: '#ffffff', borderLeft:'1px solid #dcdde1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '95%', height: '92%' }}>
          {userProfile && <ChatChamado registroId={tarefaSelecionada?.id} tipo="boleto" userProfile={userProfile} />}
        </div>
        </div>

      </div>
      </div>
    )}

    <style jsx global>{`
      * { font-weight: 300 !important; font-family: 'Montserrat', sans-serif; box-sizing: border-box; }
      .kanban-card { background: #ffffff; border: 1px solid #dcdde1; border-radius: 0px; transition: 0.4s ease; overflow: hidden; margin-bottom: 20px; flex-shrink: 0; }
      .kanban-card:hover { transform: scale(1.02); box-shadow: 0 15px 30px rgba(47, 54, 64, 0.05); border-color: #718093; }
      .btn-back { background: transparent; color: #718093; border: 1px solid #dcdde1; padding: 12px 28px; border-radius: 0px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size:12px; transition: 0.2s; text-transform: uppercase; letter-spacing: 1px; }
      .btn-back:hover { background: #2f3640; color: #f5f6fa; }
      
      ::-webkit-scrollbar { width: 6px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #dcdde1; border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: #718093; }
    `}</style>
    </div>
)
}

function AttachmentTag({ icon, label, fileUrl, onUpload, disabled = false }) {
      const fileInputRef = useRef(null);
      return (
          <div style={{ display: 'flex', alignItems: 'center', background: '#f5f6fa', border: '1px solid #dcdde1', borderRadius: '0px', overflow: 'hidden', minWidth:'280px', marginBottom: '5px' }}>
              <div style={{ padding: '0 15px', color: '#000' }}>{icon}</div>
              <span style={{ padding: '12px 20px', fontSize: '13px', color: fileUrl ? '#27ae60' : '#718093', borderRight: '1px solid #dcdde1', flex: 1, textTransform:'uppercase', letterSpacing:'1px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              <div style={{ display: 'flex', background: '#ffffff' }}>
                  {fileUrl && (
                      <button title="Visualizar" onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn}><Eye size={18} color="#4f46e5" /></button>
                  )}
                  {!disabled && (
                      <>
                          <button title="Substituir" onClick={() => fileInputRef.current.click()} style={miniActionBtn}><RefreshCw size={18} color="#718093" /></button>
                          <input type="file" hidden ref={fileInputRef} onChange={(e) => onUpload(e.target.files[0])} />
                      </>
                  )}
              </div>
          </div>
      );
}

// --- ESTILOS AUXILIARES ---
const colWrapperStyle = { flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', overflowY: 'auto', padding: '25px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid #dcdde1', borderRadius: '0px' };
const colTitleStyle = { textAlign: 'center', fontSize: '30px', color:'#718093', fontWeight:'300 !important', marginBottom:'30px', textTransform:'uppercase', letterSpacing:'5px', padding: '15px', borderBottom: '1px solid #dcdde1' };
const btnActionRed = { flex: 1, background: 'transparent', color: '#c0392b', border: '1px solid #c0392b', padding: '22px', borderRadius: '0px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' , gap: '15px', fontSize: '15px', textTransform:'uppercase', letterSpacing:'2px' };
const btnActionGreen = { flex: 1, background: 'transparent', color: '#27ae60', border: '1px solid #27ae60', padding: '22px', borderRadius: '0px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', fontSize: '15px', textTransform:'uppercase', letterSpacing:'2px' };
const btnActionBlue = { flex: 1, background: 'transparent', color: '#2980b9', border: '1px solid #2980b9', padding: '22px', borderRadius: '0px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', fontSize: '15px', textTransform:'uppercase', letterSpacing:'2px' };
const inputFilterStyle = { padding: '15px 15px 15px 50px', width: '100%', borderRadius: '0px', border: '1px solid #dcdde1', outline: 'none', background:'#ffffff', color:'#2f3640', fontSize: '15px', boxSizing: 'border-box' };
const iconFilterStyle = { position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#718093', zIndex: 10 };
const highlightIdStyle = { fontSize: '15px', color: '#718093', border: '1px solid #dcdde1', padding: '5px 15px', borderRadius: '0px', display: 'inline-block', marginTop: '10px', letterSpacing:'1px' };
const cardInfoStyle = { display:'flex', alignItems:'center', gap:'12px', color:'#718093', fontSize:'15px', marginBottom:'10px', letterSpacing: '0.5px' };
const inputStyleModal = { width: '100%', padding: '22px', border: '1px solid #dcdde1', borderRadius: '0px', outline: 'none', background:'#ffffff', color:'#2f3640', fontSize: '20px', boxSizing: 'border-box' };
const labelModalStyle = { fontSize:'15px', color:'#718093', letterSpacing:'3px', textTransform:'uppercase', marginBottom:'15px', display:'block' };
const pModalStyle = { fontSize:'24px', color:'#0f172a', margin: 0, fontWeight: '700' };
const fieldBoxModal = { border: '1px solid #dcdde1', padding: '30px', borderRadius: '0px', background: 'rgba(245, 246, 250, 0.5)', flex: 1 };
const fieldBoxInner = { padding: '10px', background: 'transparent' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', hover: { background: '#f1f5f9' } };