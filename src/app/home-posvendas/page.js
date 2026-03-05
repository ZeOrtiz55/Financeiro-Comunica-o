'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import MenuLateral from '@/components/MenuLateral'
import { marcarMinhaAcao } from '@/components/NotificationSystem'
import { formatarDataBR, formatarMoeda, getRequisicoes } from '@/lib/utils'
import {
  X, Send, ArrowLeft, RefreshCw, MessageSquare, PlusCircle, CheckCircle,
  FileText, Download, Eye, Calendar, CreditCard, User as UserIcon, Tag, Search, DollarSign, Upload, Barcode, Trash2, Paperclip, AlertCircle
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO PADRONIZADA ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#212124', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: '#f8fafc', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
          Painel Pós-Vendas <br /><span style={{ fontWeight: '400', fontSize: '32px', color: '#9e9e9e' }}>Nova Tratores</span>
        </h1>
    </div>
  )
}

// formatarDataBR, formatarMoeda e getRequisicoes importados de @/lib/utils

function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#2a2a2d', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(42, 42, 45, 0.4) 100%)' }}></div>
    </div>
  )
}

// --- 2. CHAT ---
function ChatChamado({ chamadoId, userProfile, tipo }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()
  const colunaLink = tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : 'chamado_id';

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq(colunaLink, chamadoId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
    const channel = supabase.channel(`chat_pv_${chamadoId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaLink}=eq.${chamadoId}` }, payload => { 
      if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]);
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id, colunaLink]);

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    try { const a = new Audio(`/${userProfile?.som_notificacao || 'som-notificacao-1.mp3'}`); a.volume = 0.4; a.play().catch(() => {}) } catch(e) {}
    const insertPayload = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id };
    insertPayload[colunaLink] = chamadoId;
    await supabase.from('mensagens_chat').insert([insertPayload])
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #55555a', borderRadius: '24px', overflow: 'hidden', background: '#242427', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
      <div style={{ padding: '15px 25px', background: '#3f3f44', borderBottom: '1px solid #55555a', fontSize: '12px', color: '#9e9e9e', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {mensagens.map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#3b82f620' : '#3f3f44', color: '#fff', padding: '14px 18px', borderRadius: '18px', maxWidth: '85%', border: '1px solid #55555a' }}>
            <span style={{ fontSize: '9px', opacity: 0.6, display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>{m.usuario_nome}</span>
            <span style={{ fontSize: '15px', lineHeight: '1.4' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '20px', background: '#3f3f44', display: 'flex', gap: '12px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #55555a', background: '#2a2a2d', color: '#fff', outline: 'none', fontSize: '16px' }} />
        <button style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
      </form>
    </div>
  )
}

function HomePosVendasContent() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [listaBoletos, setListaBoletos] = useState([]);
  const [listaPagar, setListaPagar] = useState([]);
  const [listaRH, setListaRH] = useState([]);
  const [showNovoMenu, setShowNovoMenu] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  // --- CARREGAMENTO UNIFICADO: FIM DOS CARDS FILHOS E FILTRO DE PIX ---
  const carregarDados = async () => {
    try {
      const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false});
      
      // FILTRO: Remove PIX e foca em "Enviar para cliente" ou "Cobrança"
      const tarefasFaturamento = (bolds || [])
        .filter(t => !t.forma_pagamento?.toLowerCase().includes('pix'))
        .filter(t => t.status === 'enviar_cliente' || (t.status === 'vencido' && t.tarefa?.includes('Cobrar')))
        .map(t => {
          const temComprovante = t.comprovante_pagamento || t.comprovante_pagamento_p1 || t.comprovante_pagamento_p2 || t.comprovante_pagamento_p3 || t.comprovante_pagamento_p4 || t.comprovante_pagamento_p5;
          return {
            ...t,
            valor_exibicao: t.valor_servico,
            isPagamentoRealizado: !!temComprovante,
            gTipo: 'boleto'
          };
        });

      setListaBoletos(tarefasFaturamento);

      const { data: pag } = await supabase.from('finan_pagar').select('*').eq('status', 'financeiro').order('id', { ascending: false });
      const { data: rh } = await supabase.from('finan_rh').select('*').neq('status', 'concluido');

      setListaPagar((pag || []).map(p => ({ ...p, gTipo: 'pagar' })));
      setListaRH((rh || []).map(rhItem => ({ ...rhItem, gTipo: 'rh' })));

    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const channel = supabase
      .channel('home_pv_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_pagar' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_rh' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(channel) };
  }, []);

  const handleUpdateField = async (t, field, value) => {
    const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
    await supabase.from(table).update({ [field]: value }).eq('id', t.id);
    carregarDados();
    if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateFileDirect = async (t, field, file) => {
    if(!file) return;
    try {
      const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
      const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      
      await supabase.from(table).update({ [field]: linkData.publicUrl }).eq('id', t.id);
      alert("Arquivo atualizado!");
      carregarDados();
      if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: linkData.publicUrl }));
    } catch (err) { alert("Erro ao enviar: " + err.message); }
  };

  const handleConcluirRecobranca = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'vencido', tarefa: 'Cliente Recobrado (Aguardando Financeiro)' }).eq('id', t.id);
    alert(`Cobrança registrada!`); setTarefaSelecionada(null); carregarDados();
  };

  const handleConfirmarEnvioBoleto = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'aguardando_vencimento', tarefa: 'Aguardando Vencimento' }).eq('id', t.id);
    alert("Boleto enviado!"); setTarefaSelecionada(null); carregarDados();
  };

  const handleMoverParaPago = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'pago', tarefa: 'Pagamento Confirmado' }).eq('id', t.id);
    alert("Confirmado!"); setTarefaSelecionada(null); carregarDados();
  };

  const handleAddRequisicao = async (t) => {
    const reqs = getRequisicoes(t);
    reqs.push({ numero: '', anexo_url: '' });
    await handleUpdateField(t, 'requisicoes_json', JSON.stringify(reqs));
  };

  const handleRemoveRequisicao = async (t, index) => {
    const reqs = getRequisicoes(t);
    reqs.splice(index, 1);
    await handleUpdateField(t, 'requisicoes_json', JSON.stringify(reqs));
  };

  const handleRequisicaoAnexo = async (t, index, file) => {
    if (!file) return;
    try {
      const path = `requisicoes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      const reqs = getRequisicoes(t);
      reqs[index] = { ...reqs[index], anexo_url: linkData.publicUrl };
      await handleUpdateField(t, 'requisicoes_json', JSON.stringify(reqs));
    } catch (err) { alert("Erro: " + err.message); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');
        const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
        setUserProfile(prof); carregarDados();
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }; init();
  }, [router]);

  useEffect(() => {
    const id = searchParams.get('id');
    const tipo = searchParams.get('tipo');
    if (!id || !tipo) return;
    const listas = { boleto: listaBoletos, pagar: listaPagar, rh: listaRH };
    const card = (listas[tipo] || []).find(t => String(t.id) === id);
    if (card) setTarefaSelecionada(card);
  }, [searchParams, listaBoletos, listaPagar, listaRH]);

  if (loading) return <LoadingScreen />

  // --- LÓGICAS CONDICIONAIS DE INTERFACE DO MODAL ---
  const isBoleto30 = tarefaSelecionada?.forma_pagamento === 'Boleto 30 dias';
  const isParcelamento = tarefaSelecionada?.forma_pagamento?.toLowerCase().includes('parcelado');
  const valorIndividual = tarefaSelecionada ? (tarefaSelecionada.valor_servico / (tarefaSelecionada.qtd_parcelas || 1)) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#2a2a2d', fontFamily: 'Montserrat, sans-serif' }}>
      <GeometricBackground />
      <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/" router={router} handleLogout={handleLogout} userProfile={userProfile} />

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', transition: '0.4s ease' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
          <div>
            <h1 style={{ fontWeight: '300', color: '#f8fafc', margin: 0, fontSize:'42px', letterSpacing: '-1.5px' }}>Painel Pós-Vendas</h1>
            <div style={{ width: '80px', height: '4px', background: '#9e9e9e', marginTop: '12px' }}></div>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowNovoMenu(s => !s)} style={btnNovoStyle}>
              <PlusCircle size={20}/> NOVO CHAMADO
            </button>
            {showNovoMenu && (
              <>
                {/* overlay invisível para fechar ao clicar fora */}
                <div onClick={() => setShowNovoMenu(false)} style={{ position:'fixed', inset:0, zIndex:1999 }} />
                <div style={dropdownStyle}>
                  <div style={dropdownItemStyle}
                    onClick={() => { setShowNovoMenu(false); router.push('/novo-chamado-nf') }}
                    onMouseEnter={e => e.currentTarget.style.background='#55555a'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(14,165,233,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <FileText size={18} color="#38bdf8"/>
                      </div>
                      <div>
                        <div style={{ fontSize:'14px', color:'#f8fafc', fontWeight:'600' }}>Chamado NF</div>
                        <div style={{ fontSize:'11px', color:'#71717a' }}>Nota fiscal / faturamento</div>
                      </div>
                    </div>
                  </div>
                  <div style={dropdownItemStyle}
                    onClick={() => { setShowNovoMenu(false); router.push('/novo-pagar-receber?tipo=pagar') }}
                    onMouseEnter={e => e.currentTarget.style.background='#55555a'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(239,68,68,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <DollarSign size={18} color="#f87171"/>
                      </div>
                      <div>
                        <div style={{ fontSize:'14px', color:'#f8fafc', fontWeight:'600' }}>Chamado Pagar</div>
                        <div style={{ fontSize:'11px', color:'#71717a' }}>Lançar conta a pagar</div>
                      </div>
                    </div>
                  </div>
                  <div style={dropdownItemStyle}
                    onClick={() => { setShowNovoMenu(false); router.push('/novo-pagar-receber?tipo=receber') }}
                    onMouseEnter={e => e.currentTarget.style.background='#55555a'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Download size={18} color="#93c5fd"/>
                      </div>
                      <div>
                        <div style={{ fontSize:'14px', color:'#f8fafc', fontWeight:'600' }}>Chamado Receber</div>
                        <div style={{ fontSize:'11px', color:'#71717a' }}>Lançar conta a receber</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ ...dropdownItemStyle, borderBottom:'none' }}
                    onClick={() => { setShowNovoMenu(false); router.push('/novo-chamado-rh') }}
                    onMouseEnter={e => e.currentTarget.style.background='#55555a'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(168,85,247,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <UserIcon size={18} color="#c084fc"/>
                      </div>
                      <div>
                        <div style={{ fontSize:'14px', color:'#f8fafc', fontWeight:'600' }}>Chamado RH</div>
                        <div style={{ fontSize:'11px', color:'#71717a' }}>Solicitação interna de RH</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
            {/* COLUNA FATURAMENTO (FILTRADA: SEM PIX, APENAS ENVIAR OU COBRAR) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={colHeaderStyle}>TAREFA FATURAMENTO</div>
                {listaBoletos.map(t => (
                  <div key={`boleto-${t.id}`} onClick={() => setTarefaSelecionada(t)} className="task-card">
                    <div style={{ background: t.tarefa?.includes('Cobrar') ? '#fca5a520' : '#313134', padding: '24px', borderBottom: '1px solid #55555a' }}>
                      <div style={{fontSize: '10px', color: t.tarefa?.includes('Cobrar') ? '#fca5a5' : '#9e9e9e', letterSpacing:'1px', marginBottom: '8px', textTransform:'uppercase'}}>{t.tarefa}</div>
                      <span style={{fontSize:'18px', color:'#fff', display:'block', lineHeight: '1.2'}}>{t.nom_cliente?.toUpperCase()}</span>
                      {t.isPagamentoRealizado && <div style={{marginTop: '10px', color: '#4ade80', fontSize: '11px', fontWeight: '700'}}>✓ PAGAMENTO REALIZADO</div>}
                    </div>
                    <div style={{ padding: '24px', background: '#4e4e52' }}>
                      <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom:'15px'}}>
                        <div style={cardMetaStyle}><CreditCard size={13}/> {t.forma_pagamento?.toUpperCase()}</div>
                        <div style={cardMetaStyle}><Calendar size={13}/> {formatarDataBR(t.vencimento_boleto)}</div>
                      </div>
                      <div style={{fontSize:'26px', color: '#fff'}}>{formatarMoeda(t.valor_exibicao)}</div>
                    </div>
                  </div>
                ))}
            </div>

            {/* COLUNA REQUISIÇÕES / A PAGAR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={colHeaderStyle}>REQUISIÇÕES</div>
                {listaPagar.map((t) => (
                  <div key={`pag-${t.id}`} onClick={() => setTarefaSelecionada(t)} className="task-card">
                    <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.12)', borderLeft: '6px solid #ef4444' }}>
                        <small style={{ color: '#fca5a5', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px', fontWeight: '800' }}>FORNECEDOR</small>
                        <div style={{ marginTop: '10px', fontSize: '20px', color: '#fff', fontWeight: '700' }}>{t.fornecedor?.toUpperCase()}</div>
                        <div style={{ fontSize: '24px', marginTop: '12px', color: '#fff', fontWeight: '700' }}>{formatarMoeda(t.valor)}</div>
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {getRequisicoes(t).filter(r => r.numero).map((req, i) => (
                            <span key={i} style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '10px', fontWeight: '800', padding: '4px 8px', border: '1px solid #ef444450', borderRadius: '4px' }}>#{req.numero}</span>
                          ))}
                        </div>
                    </div>
                    <div style={{ padding: '14px 24px', background: '#4e4e52', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#d1d5db', fontSize: '13px' }}>{t.metodo || 'Despesa'}</span>
                      <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: '800' }}>VENC: {formatarDataBR(t.data_vencimento)}</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* COLUNA RH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={colHeaderStyle}>CHAMADO RH</div>
                {listaRH.map(t => (
                  <div key={`rh-${t.id}`} onClick={() => setTarefaSelecionada(t)} className="task-card">
                    <div style={{ background: '#313134', padding: '24px', color: '#fff' }}>
                      <div style={{fontSize: '11px', color: '#93c5fd', letterSpacing: '1px', textTransform:'uppercase'}}>SOLICITAÇÃO INTERNA</div>
                      <span style={{fontSize:'20px', display:'block', marginTop:'10px'}}>{t.funcionario?.toUpperCase()}</span>
                    </div>
                    <div style={{ padding: '24px', background: '#4e4e52' }}>
                      <div style={{display:'flex', alignItems:'center', gap:'10px', color: '#d1d5db'}}><Tag size={16}/> {t.titulo}</div>
                    </div>
                  </div>
                ))}
            </div>
        </div>
      </main>

      {/* --- MODAL DETALHES --- */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e21', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow:'0 50px 100px rgba(0,0,0,0.6)', border: '1px solid #3f3f44' }}>
            <div style={{ flex: 1.2, padding: '60px', display:'flex', flexDirection:'column', overflowY:'auto', color: '#e2e8f0', background: '#1e1e21' }}>
              <button onClick={() => setTarefaSelecionada(null)} style={btnBackStyle}><ArrowLeft size={18}/> VOLTAR AO PAINEL</button>
              
              <div style={{marginTop: '35px'}}>
                  <h2 style={{fontSize:'32px', fontWeight:'400', margin:0, letterSpacing: '-1px', color:'#f8fafc', lineHeight: '1.1'}}>{tarefaSelecionada.nom_cliente || tarefaSelecionada.fornecedor || tarefaSelecionada.funcionario || tarefaSelecionada.cliente}</h2>
                  
                  <div style={{display:'flex', gap:'30px', marginTop:'40px', marginBottom:'45px'}}>
                      <div style={fieldBoxModal}>
                        <label style={labelMStyle}>{tarefaSelecionada.gTipo === 'rh' ? 'MOTIVO' : 'CONDIÇÃO/MÉTODO'}</label>
                        <p style={pModalStyle}>{tarefaSelecionada.gTipo === 'pagar' ? (tarefaSelecionada.metodo?.toUpperCase() || 'N/A') : (tarefaSelecionada.forma_pagamento?.toUpperCase() || tarefaSelecionada.metodo?.toUpperCase() || 'N/A')}</p>
                      </div>
                      {tarefaSelecionada.gTipo !== 'rh' && (
                        <>
                          <div style={fieldBoxModal}>
                            <label style={labelMStyle}>VALOR DO REGISTRO</label>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                              <span style={{fontSize:'22px', fontWeight:'700', color:'#9e9e9e'}}>R$</span>
                              <input type="number" style={{ ...inputStyleLight, border:'none', padding:0, fontSize:'34px', fontWeight:'800', background:'transparent' }} defaultValue={tarefaSelecionada.valor_exibicao || tarefaSelecionada.valor} onBlur={e => handleUpdateField(tarefaSelecionada, tarefaSelecionada.gTipo === 'boleto' ? 'valor_servico' : 'valor', e.target.value)} />
                            </div>
                          </div>
                          <div style={fieldBoxModal}>
                            <label style={labelMStyle}>DATA DE VENCIMENTO</label>
                            <input type="date" style={{ ...inputStyleLight, border:'none', padding:0, fontSize:'30px', fontWeight:'800', background:'transparent', color:'#ef4444' }} defaultValue={tarefaSelecionada.vencimento_boleto || tarefaSelecionada.data_vencimento} onBlur={e => handleUpdateField(tarefaSelecionada, tarefaSelecionada.gTipo === 'boleto' ? 'vencimento_boleto' : 'data_vencimento', e.target.value)} />
                          </div>
                        </>
                      )}
                  </div>

                  {/* CAMPOS ESPECÍFICOS PAGAR */}
                  {tarefaSelecionada.gTipo === 'pagar' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px', padding:'45px', background:'#2a2a2d', border:'1px solid #3f3f44', marginBottom:'45px' }}>
                      <div style={fieldBoxInner}>
                        <label style={labelMStyle}>NÚMERO DA NOTA FISCAL</label>
                        <input style={inputStyleLight} placeholder="Ex: 000.000.000" defaultValue={tarefaSelecionada.numero_NF || ''} onBlur={e => handleUpdateField(tarefaSelecionada, 'numero_NF', e.target.value)} />
                      </div>
                      <div style={{gridColumn:'span 2', ...fieldBoxInner}}>
                        <label style={labelMStyle}>DESCRIÇÃO / OBSERVAÇÕES</label>
                        <textarea style={{...inputStyleLight, height:'120px', resize:'none'}} defaultValue={tarefaSelecionada.motivo} onBlur={e => handleUpdateField(tarefaSelecionada, 'motivo', e.target.value)} />
                      </div>
                    </div>
                  )}

                  {/* REQUISIÇÕES */}
                  {tarefaSelecionada.gTipo === 'pagar' && (
                    <div style={{ border:'1px solid #3f3f44', padding:'35px', background:'#2a2a2d', marginBottom:'45px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                        <label style={labelMStyle}>REQUISIÇÕES</label>
                        <button onClick={() => handleAddRequisicao(tarefaSelecionada)} style={{ background:'#3f3f44', color:'#9e9e9e', border:'1px solid #55555a', padding:'8px 18px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'700', letterSpacing:'1px' }}>+ ADICIONAR</button>
                      </div>
                      {getRequisicoes(tarefaSelecionada).map((req, i) => (
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'180px 1fr auto', gap:'20px', alignItems:'center', background:'#313134', padding:'18px', borderBottom:'1px solid #3f3f44', marginBottom:'4px' }}>
                          <div>
                            <label style={{ ...labelMStyle, fontSize:'11px', display:'block', marginBottom:'6px' }}>Nº REQUISIÇÃO</label>
                            <input placeholder="Ex: 00123" defaultValue={req.numero} style={inputStyleLight} onBlur={e => {
                              const reqs = getRequisicoes(tarefaSelecionada);
                              reqs[i] = { ...reqs[i], numero: e.target.value };
                              handleUpdateField(tarefaSelecionada, 'requisicoes_json', JSON.stringify(reqs));
                            }} />
                          </div>
                          <AttachmentTag icon={<Paperclip size={18} />} label={`ANEXO REQ ${req.numero || (i + 1)}`} fileUrl={req.anexo_url} onUpload={f => handleRequisicaoAnexo(tarefaSelecionada, i, f)} />
                          <button onClick={() => handleRemoveRequisicao(tarefaSelecionada, i)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#fca5a5', padding:'8px' }} title="Remover"><Trash2 size={18}/></button>
                        </div>
                      ))}
                      {getRequisicoes(tarefaSelecionada).length === 0 && (
                        <div style={{ color:'#55555a', fontSize:'13px', textAlign:'center', padding:'20px' }}>Nenhuma requisição adicionada.</div>
                      )}
                    </div>
                  )}

                  {!isBoleto30 && isParcelamento && (
                      <div style={{ display:'flex', flexDirection:'column', gap:'20px', background:'#2a2a2d', padding:'40px', border:'1px solid #3f3f44', marginBottom:'45px' }}>
                          <div style={{ display:'flex', gap:'40px', borderBottom:'1px solid #3f3f44', paddingBottom:'20px' }}>
                              <div><label style={labelMStyle}>QUANTIDADE</label><select style={{ ...inputStyleLight, width:'120px', padding:'10px' }} value={tarefaSelecionada.qtd_parcelas || 1} onChange={e => handleUpdateField(tarefaSelecionada, 'qtd_parcelas', e.target.value)}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}x</option>)}</select></div>
                              <div><label style={labelMStyle}>VALOR PARCELA</label><p style={{fontSize:'22px', fontWeight:'700'}}>{formatarMoeda(valorIndividual)}</p></div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                              <div style={cascadeRowStyle}>
                                  <span style={cascadeLabelStyle}>1ª PARCELA</span>
                                  <input type="date" style={inputCascadeStyle} defaultValue={tarefaSelecionada.vencimento_boleto} onBlur={e => handleUpdateField(tarefaSelecionada, 'vencimento_boleto', e.target.value)} />
                                  <span style={cascadeValueStyle}>{formatarMoeda(valorIndividual)}</span>
                                  <AttachmentTag label="P1" fileUrl={tarefaSelecionada.comprovante_pagamento || tarefaSelecionada.comprovante_pagamento_p1} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'comprovante_pagamento_p1', f)} />
                              </div>
                              {Array.from({ length: (tarefaSelecionada.qtd_parcelas || 1) - 1 }).map((_, i) => {
                                  const pNum = i + 2;
                                  const currentDates = (tarefaSelecionada.datas_parcelas || "").split(/[\s,]+/);
                                  return (
                                      <div key={pNum} style={cascadeRowStyle}>
                                          <span style={cascadeLabelStyle}>{pNum}ª PARCELA</span>
                                          <input type="date" style={inputCascadeStyle} defaultValue={currentDates[i] || ""} onBlur={e => { let arr = [...currentDates]; arr[i] = e.target.value; handleUpdateField(tarefaSelecionada, 'datas_parcelas', arr.join(', ')); }} />
                                          <span style={cascadeValueStyle}>{formatarMoeda(valorIndividual)}</span>
                                          <AttachmentTag label={`P${pNum}`} fileUrl={tarefaSelecionada[`comprovante_pagamento_p${pNum}`]} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, `comprovante_pagamento_p${pNum}`, f)} />
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'30px', border:'0.5px solid #3f3f44', padding:'45px', background:'#2a2a2d' }}>
                    {tarefaSelecionada.gTipo === 'rh' ? (
                      <>
                        <div style={fieldBoxInner}><label style={labelMStyle}>TÍTULO</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.titulo} onBlur={e => handleUpdateField(tarefaSelecionada, 'titulo', e.target.value)} /></div>
                        <div style={fieldBoxInner}><label style={labelMStyle}>SETOR</label><input style={{...inputStyleLight, color:'#0ea5e9'}} defaultValue={tarefaSelecionada.setor} onBlur={e => handleUpdateField(tarefaSelecionada, 'setor', e.target.value)} /></div>
                        <div style={{...fieldBoxInner, gridColumn:'span 2'}}><label style={labelMStyle}>DESCRIÇÃO</label><textarea style={{...inputStyleLight, height:'100px', resize:'none'}} defaultValue={tarefaSelecionada.descricao} onBlur={e => handleUpdateField(tarefaSelecionada, 'descricao', e.target.value)} /></div>
                      </>
                    ) : (
                      <>
                        <div style={fieldBoxInner}><label style={labelMStyle}>MÉTODO</label><p style={{fontSize:'15px', fontWeight: '600'}}>{tarefaSelecionada.forma_pagamento || 'N/A'}</p></div>
                        {tarefaSelecionada.gTipo === 'boleto' && (
                          <>
                              <div style={fieldBoxInner}><label style={labelMStyle}>NF SERVIÇO</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_servico', e.target.value)} /></div>
                              <div style={fieldBoxInner}><label style={labelMStyle}>NF PEÇA</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_peca', e.target.value)} /></div>
                          </>
                        )}
                        <div style={{gridColumn:'span 2', ...fieldBoxInner}}>
                            <label style={labelMStyle}>OBSERVAÇÕES</label>
                            <textarea style={{...inputStyleLight, height:'80px', resize: 'none'}} defaultValue={tarefaSelecionada.obs || tarefaSelecionada.motivo} onBlur={e => handleUpdateField(tarefaSelecionada, tarefaSelecionada.gTipo === 'boleto' ? 'obs' : 'motivo', e.target.value)} />
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{marginTop:'45px'}}>
                      <label style={labelMStyle}>ARQUIVOS E DOCUMENTOS</label>
                      <div style={{display:'flex', gap:'15px', marginTop:'15px', flexWrap: 'wrap'}}>
                          {tarefaSelecionada.gTipo === 'pagar' ? (
                             <>
                               {tarefaSelecionada.anexo_nf && <AttachmentTag label="Anexo" fileUrl={tarefaSelecionada.anexo_nf} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf', f)} />}
                               {tarefaSelecionada.anexo_boleto && <AttachmentTag label="Anexo" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_boleto', f)} />}
                               {tarefaSelecionada.anexo_requisicao && <AttachmentTag label="Anexo" fileUrl={tarefaSelecionada.anexo_requisicao} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_requisicao', f)} />}
                             </>
                          ) : tarefaSelecionada.gTipo === 'receber' ? (
                             <>
                               {tarefaSelecionada.anexo_nf_servico && <AttachmentTag label="Anexo" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_servico', f)} />}
                               {tarefaSelecionada.anexo_nf_peca && <AttachmentTag label="Anexo" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_peca', f)} />}
                             </>
                          ) : (
                             <>
                               <AttachmentTag label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_servico', f)} />
                               <AttachmentTag label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_peca', f)} />
                               <AttachmentTag label="BOLETO" fileUrl={tarefaSelecionada.anexo_boleto} disabled={true} />
                             </>
                          )}
                      </div>
                  </div>

                  <div style={{display:'flex', gap:'20px', marginTop:'45px'}}>
                    {tarefaSelecionada.status === 'enviar_cliente' && (
                        <button onClick={() => handleConfirmarEnvioBoleto(tarefaSelecionada)} style={btnActionGreen}>
                          <Send size={22}/> MARCAR COMO ENVIADO AO CLIENTE
                        </button>
                    )}
                    {tarefaSelecionada.tarefa?.includes('Cobrar') && (
                        <button onClick={() => handleConcluirRecobranca(tarefaSelecionada)} style={btnActionBlue}>
                          <DollarSign size={22}/> CLIENTE RECOBRADO
                        </button>
                    )}
                  </div>
              </div>
            </div>
            
            <div style={{ flex: 0.8, padding: '40px', background: '#2a2a2d', borderLeft:'1px solid #55555a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '95%', height: '92%' }}>
                {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} tipo={tarefaSelecionada.gTipo} />}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; }
        .task-card { transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; border-radius: 20px; overflow: hidden; border: 1px solid #55555a; margin-bottom: 5px; }
        .task-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.5); border-color: #71717a; }
        button:hover { opacity: 1 !important; transform: translateY(-1px); }
      `}</style>
    </div>
  )
}

function AttachmentTag({ label, fileUrl, onUpload, disabled = false }) {
    const fileInputRef = useRef(null);
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: '#2a2a2d', border: '1px solid #55555a', borderRadius: '12px', minWidth: '280px', overflow: 'hidden' }}>
            <div style={{ padding: '0 18px', color: '#71717a', background: '#313134', alignSelf: 'stretch', display: 'flex', alignItems: 'center', borderRight: '1px solid #55555a' }}>
                <FileText size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '12px 15px' }}>
                <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '700', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ fontSize: '11px', color: fileUrl ? '#4ade80' : '#f87171', fontWeight: '700' }}>{fileUrl ? 'ARQUIVO PRONTO' : 'PENDENTE'}</span>
            </div>
            <div style={{ display: 'flex', borderLeft: '1px solid #55555a' }}>
                {fileUrl && (
                    <button title="Ver" onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn}><Eye size={18} color="#9e9e9e" /></button>
                )}
                {!disabled && (
                    <>
                        <button title="Upload" onClick={() => fileInputRef.current.click()} style={miniActionBtn}><RefreshCw size={18} color="#9e9e9e" /></button>
                        <input type="file" ref={fileInputRef} hidden onChange={(e) => onUpload(e.target.files[0])} />
                    </>
                )}
            </div>
        </div>
    );
}

const colHeaderStyle = { padding: '18px', textAlign: 'center', fontSize: '16px', background: '#313134', borderRadius: '16px', border: '1px solid #55555a', color: '#9e9e9e', letterSpacing:'1.5px', fontWeight:'700' };
const cardMetaStyle = { display:'flex', alignItems:'center', gap:'8px', color:'#d1d5db', fontSize:'12px', background:'#313134', padding:'6px 10px', borderRadius:'10px', border: '1px solid #55555a' };
const btnNovoStyle = { background:'#3f3f44', color:'#fff', border:'1px solid #55555a', padding:'12px 28px', borderRadius:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', fontSize: '15px' };
const dropdownStyle = { position:'absolute', top:'65px', right: 0, background:'#3f3f44', borderRadius:'22px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', zIndex:2000, width:'300px', border:'1px solid #55555a', overflow:'hidden' };
const dropdownItemStyle = { padding:'18px 25px', cursor:'pointer', borderBottom:'1px solid #55555a', fontSize:'15px', color: '#e2e8f0', transition:'0.2s' };
const btnBackStyle = { background: '#3f3f44', color: '#9e9e9e', border: '1px solid #55555a', padding: '10px 24px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', marginBottom: '10px' };
const fieldBoxModal = { border: '1px solid #3f3f44', padding: '25px', background: '#2a2a2d', flex: 1, borderRadius: '12px' };
const fieldBoxInner = { padding: '10px' };
const labelMStyle = { fontSize:'13px', color:'#71717a', textTransform:'uppercase', fontWeight: '700', marginBottom: '8px', display: 'block' };
const pModalStyle = { fontSize:'24px', color:'#f8fafc', margin: 0, fontWeight: '700' };
const inputStyleLight = { width: '100%', padding: '15px', border: '1px solid #55555a', outline: 'none', background:'#3f3f44', color:'#f8fafc', fontSize: '15px', borderRadius: '8px' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '10px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' };
const btnActionGreen = { flex:1, color:'#fff', background:'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', border:'none', padding:'22px', borderRadius:'18px', cursor:'pointer', display:'flex', alignItems:'center', gap:'15px', fontSize:'16px', justifyContent:'center', fontWeight: '700', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.3)', transition: '0.3s' };
const btnActionBlue = { flex:1, color:'#fff', background:'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border:'none', padding:'22px', borderRadius:'18px', cursor:'pointer', display:'flex', alignItems:'center', gap:'15px', fontSize:'16px', justifyContent:'center', fontWeight: '700', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)', transition: '0.3s' };
const cascadeRowStyle = { display: 'grid', gridTemplateColumns: '150px 180px 150px 280px', gap: '20px', alignItems: 'center', background: '#1e1e21', padding: '12px', border: '1px solid #3f3f44' };
const cascadeLabelStyle = { fontSize: '11px', color: '#71717a', fontWeight: '700', letterSpacing: '0.5px' };
const inputCascadeStyle = { background: '#3f3f44', border: '1px solid #55555a', color: '#f8fafc', padding: '8px', fontSize: '13px', outline: 'none', borderRadius: '6px' };
const cascadeValueStyle = { fontSize: '16px', color: '#f8fafc', fontWeight: '600' };

export default function HomePosVendas() {
  return (
    <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#212124', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#f8fafc', fontFamily: 'Montserrat, sans-serif', fontSize: '20px', letterSpacing: '4px' }}>CARREGANDO...</span></div>}>
      <HomePosVendasContent />
    </Suspense>
  )
}