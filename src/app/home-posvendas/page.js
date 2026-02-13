
'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MenuLateral from '@/components/MenuLateral'
import { 
  X, Send, ArrowLeft, RefreshCw, MessageSquare, PlusCircle, CheckCircle, 
  FileText, Download, Eye, Calendar, CreditCard, User as UserIcon, Tag, Search, DollarSign
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

const formatarDataBR = (dataStr) => {
  if (!dataStr || dataStr === 'null' || dataStr === 'N/A') return 'N/A';
  try {
    if (dataStr.includes('/') && dataStr.split('/')[0].length <= 2) return dataStr;
    const dateObj = new Date(dataStr);
    if (isNaN(dateObj.getTime())) {
      const partes = dataStr.split(' ')[0].split('-');
      if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
      return dataStr;
    }
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch (e) { return dataStr; }
};

function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#2a2a2d', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(42, 42, 45, 0.4) 100%)' }}></div>
    </div>
  )
}

// --- 2. CHAT COM EFEITO FLUTUANTE ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()
  const idReal = chamadoId ? (String(chamadoId).includes('_p') ? parseInt(String(chamadoId).split('_p')[0]) : parseInt(String(chamadoId))) : null;

  useEffect(() => {
    if (!idReal || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', idReal).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
    const channel = supabase.channel(`chat_pv_${idReal}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${idReal}` }, payload => { 
      if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]);
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [idReal, userProfile?.id])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: idReal }])
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

export default function HomePosVendas() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [listaBoletos, setListaBoletos] = useState([]);
  const [listaPagar, setListaPagar] = useState([]);
  const [listaReceber, setListaReceber] = useState([]);
  const [listaRH, setListaRH] = useState([]);
  const [showNovoMenu, setShowNovoMenu] = useState(false);
  const router = useRouter();

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const carregarDados = async () => {
    const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false});
    let tarefasPv = [];
    (bolds || []).forEach(t => {
      // Regra para carregar tarefas PV
      if (t.status === 'enviar_cliente' || t.tarefa?.includes('Cobrar')) {
        tarefasPv.push({ ...t, valor_exibicao: t.valor_servico, cont_cob: t.recombrancas_qtd || 0 });
      }
      for (let i = 1; i <= t.qtd_parcelas; i++) { 
        if (t[`status_p${i}`] === 'enviar_cliente' || t[`tarefa_p${i}`]?.includes('Cobrar')) {
          const valorParc = t[`valor_parcela${i}`];
          const valorFinal = (valorParc && valorParc > 0) ? valorParc : (t.valor_servico / t.qtd_parcelas).toFixed(2);

          tarefasPv.push({ 
            ...t, 
            id_virtual: `${t.id}_p${i}`, 
            nom_cliente: `${t.nom_cliente} (P${i})`, 
            valor_exibicao: valorFinal, 
            status: t[`status_p${i}`], 
            tarefa: t[`tarefa_p${i}`],
            cont_cob: t[`recombrancas_qtd_p${i}`] || 0,
            vencimento_boleto: t.datas_parcelas?.split(/[\s,]+/)[i-1] || t.vencimento_boleto,
            num_parcela: i
          }); 
        } 
      }
    });
    setListaBoletos(tarefasPv);

    const { data: pag } = await supabase.from('finan_pagar').select('*').eq('status', 'pos_vendas');
    const { data: rec } = await supabase.from('finan_receber').select('*').eq('status', 'pos_vendas');
    const { data: rh } = await supabase.from('finan_rh').select('*').eq('status', 'pos_vendas');
    setListaPagar(pag || []); setListaReceber(rec || []); setListaRH(rh || []);
  };

  // --- BLOCO REALTIME CONFIGURADO ---
  useEffect(() => {
    const channel = supabase
      .channel('home_pv_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_pagar' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_receber' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_rh' }, () => carregarDados())
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, []);

  const handleConcluirRecobranca = async (t) => {
    const isParcela = !!t.id_virtual;
    const pNum = t.num_parcela;
    
    // Deixa em VENCIDO até o financeiro mudar, apenas atualiza a tarefa
    let updateData = isParcela ? {
        [`status_p${pNum}`]: 'vencido', 
        [`tarefa_p${pNum}`]: 'Cliente Recobrado (Aguardando Financeiro)'
      } : {
        status: 'vencido',
        tarefa: 'Cliente Recobrado (Aguardando Financeiro)'
      };

    const { error } = await supabase.from('Chamado_NF').update(updateData).eq('id', t.id);
    if (!error) { 
      alert(`Cobrança registrada com sucesso!`); 
      setTarefaSelecionada(null); 
      carregarDados(); 
    }
  };

  const handleConfirmarEnvioBoleto = async (t) => {
    const isParcela = !!t.id_virtual;
    const pNum = t.num_parcela;
    
    let updateData = isParcela ? {
        [`status_p${pNum}`]: 'aguardando_vencimento',
        [`tarefa_p${pNum}`]: 'Aguardando Vencimento'
      } : {
        status: 'aguardando_vencimento',
        tarefa: 'Aguardando Vencimento'
      };

    const { error } = await supabase.from('Chamado_NF').update(updateData).eq('id', t.id);
    if (!error) { alert("Boleto marcado como enviado!"); setTarefaSelecionada(null); carregarDados(); }
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

  if (loading) return <LoadingScreen />

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
            <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={btnNovoStyle}><PlusCircle size={20}/> NOVO CHAMADO</button>
            {showNovoMenu && (
              <div onMouseLeave={() => setShowNovoMenu(false)} style={dropdownStyle}>
                <div onClick={() => router.push('/novo-chamado-nf')} style={dropdownItemStyle}>Chamado de Boleto</div>
                <div onClick={() => router.push('/novo-pagar-receber')} style={dropdownItemStyle}>Contas Pagar / Receber</div>
                <div onClick={() => router.push('/novo-chamado-rh')} style={{ ...dropdownItemStyle, borderBottom:'none', color: '#93c5fd' }}>Chamado de RH</div>
              </div>
            )}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={colHeaderStyle}>TAREFA FATURAMENTO</div>
                {listaBoletos.map(t => (
                  <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
                    <div style={{ background: t.tarefa?.includes('Cobrar') ? '#fca5a520' : '#313134', padding: '24px', borderBottom: '1px solid #55555a' }}>
                      <div style={{fontSize: '10px', color: t.tarefa?.includes('Cobrar') ? '#fca5a5' : '#9e9e9e', letterSpacing:'1px', marginBottom: '8px', textTransform:'uppercase'}}>{t.tarefa}</div>
                      <span style={{fontSize:'18px', color:'#fff', display:'block', lineHeight: '1.2'}}>{t.nom_cliente?.toUpperCase()}</span>
                    </div>
                    <div style={{ padding: '24px', background: '#4e4e52' }}>
                      <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom:'15px'}}>
                        <div style={cardMetaStyle}><CreditCard size={13}/> {t.forma_pagamento?.toUpperCase()}</div>
                        <div style={cardMetaStyle}><Calendar size={13}/> {formatarDataBR(t.vencimento_boleto)}</div>
                      </div>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:'26px', color: '#fff'}}>R$ {t.valor_exibicao}</span>
                        {t.cont_cob > 0 && <span style={cobroBadgeStyle}>COBRADO {t.cont_cob}x</span>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={colHeaderStyle}>CONTAS: PAGAR/RECEBER</div>
                {[...listaPagar, ...listaReceber].map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
                    <div style={{padding: '24px', background: '#313134'}}>
                        <small style={{color: t.fornecedor ? '#fca5a5' : '#93c5fd', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px'}}>{t.fornecedor ? 'A Pagar' : 'A Receber'}</small>
                        <div style={{marginTop:'10px', fontSize:'20px', color: '#fff'}}>{(t.fornecedor || t.cliente)?.toUpperCase()}</div>
                        <div style={{fontSize:'24px', marginTop:'12px', color: '#fff'}}>R$ {t.valor}</div>
                    </div>
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={colHeaderStyle}>CHAMADO RH</div>
                {listaRH.map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
                    <div style={{ background: '#313134', padding: '24px', color: '#fff' }}>
                      <div style={{fontSize: '11px', color: '#93c5fd', letterSpacing: '1px', textTransform:'uppercase'}}>SOLICITAÇÃO INTERNA</div>
                      <span style={{fontSize:'20px', display:'block', marginTop:'10px'}}>{t.funcionario?.toUpperCase()}</span>
                    </div>
                    <div style={{ padding: '24px', background: '#4e4e52' }}>
                      <div style={{display:'flex', alignItems:'center', gap:'10px', color: '#d1d5db'}}>
                        <Tag size={16}/> {t.titulo}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
        </div>
      </main>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#3f3f44', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow:'0 50px 100px rgba(0,0,0,0.6)', border: '1px solid #55555a' }}>
            
            <div style={{ flex: 1.2, padding: '60px', display:'flex', flexDirection:'column', overflowY:'auto' }}>
              <button onClick={() => setTarefaSelecionada(null)} style={btnBackStyle}><ArrowLeft size={18}/> VOLTAR AO PAINEL</button>
              
              <div style={{marginTop: '35px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <div>
                          <h2 style={{fontSize:'58px', fontWeight:'300', margin:0, letterSpacing: '-2.5px', color:'#fff', lineHeight: '1.1'}}>{tarefaSelecionada.nom_cliente || tarefaSelecionada.fornecedor || tarefaSelecionada.funcionario}</h2>
                          <span style={{background:'#2a2a2d', padding:'8px 20px', borderRadius:'12px', fontSize:'13px', color:'#9e9e9e', display:'inline-block', marginTop:'15px', border: '1px solid #55555a'}}>ID PROCESSO: #{tarefaSelecionada.id}</span>
                      </div>
                      <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'42px', fontWeight:'400', color:'#fff'}}>R$ {tarefaSelecionada.valor_exibicao || tarefaSelecionada.valor}</div>
                          <div style={{color:'#fca5a5', fontSize:'20px', marginTop: '10px'}}>VENCIMENTO: {formatarDataBR(tarefaSelecionada.vencimento_boleto || tarefaSelecionada.data_vencimento)}</div>
                      </div>
                  </div>

                  <div style={infoGridStyle}>
                      <div style={infoBoxStyle}>
                          <label style={labelMStyle}>CONDIÇÃO</label>
                          <span style={valueMStyle}>{tarefaSelecionada.forma_pagamento || 'N/A'}</span>
                      </div>
                      <div style={infoBoxStyle}>
                          <label style={labelMStyle}>DOCUMENTO (NF)</label>
                          <span style={valueMStyle}>{tarefaSelecionada.num_nf_servico || tarefaSelecionada.num_nf_peca || 'PENDENTE'}</span>
                      </div>
                      <div style={infoBoxStyle}>
                          <label style={labelMStyle}>STATUS</label>
                          <span style={{...valueMStyle, color: '#93c5fd'}}>{tarefaSelecionada.status?.toUpperCase()}</span>
                      </div>
                  </div>

                  <div style={{marginTop:'45px'}}>
                      <label style={labelMStyle}>ARQUIVOS DO CHAMADO</label>
                      <div style={{display:'flex', gap:'15px', marginTop:'15px'}}>
                          {tarefaSelecionada.anexo_boleto && <a href={tarefaSelecionada.anexo_boleto} target="_blank" style={btnAnexoStyle}><Download size={18}/> BOLETO ATUALIZADO</a>}
                          {(tarefaSelecionada.anexo_nf_servico || tarefaSelecionada.anexo_nf) && <a href={tarefaSelecionada.anexo_nf_servico || tarefaSelecionada.anexo_nf} target="_blank" style={btnAnexoStyle}><FileText size={18}/> NOTA FISCAL</a>}
                          {tarefaSelecionada.comprovante_pagamento && <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" style={btnAnexoStyle}><CheckCircle size={18}/> COMPROVANTE</a>}
                      </div>
                  </div>

                  <div style={{marginTop:'40px', background:'#2a2a2d', padding:'35px', borderRadius:'28px', border:'1px solid #55555a'}}>
                      <label style={labelMStyle}>DESCRIÇÃO DA TAREFA / OBSERVAÇÕES</label>
                      <p style={{marginTop:'15px', fontSize:'18px', lineHeight:'1.6', color:'#e2e8f0'}}>{tarefaSelecionada.tarefa || tarefaSelecionada.descricao || tarefaSelecionada.obs || 'Sem observações adicionais.'}</p>
                  </div>
              </div>

              <div style={{display:'flex', gap:'20px', marginTop:'45px'}}>
                {tarefaSelecionada.status === 'enviar_cliente' && (
                    <button onClick={() => handleConfirmarEnvioBoleto(tarefaSelecionada)} style={btnActionGreen}><Send size={22}/> BOLETO ENVIADO PARA O CLIENTE</button>
                )}

                {tarefaSelecionada.tarefa?.includes('Cobrar') && (
                    <button onClick={() => handleConcluirRecobranca(tarefaSelecionada)} style={btnActionBlue}><DollarSign size={22}/> CLIENTE RECOBRADO</button>
                )}
              </div>
            </div>
            
            <div style={{ flex: 0.8, padding: '40px', background: '#2a2a2d', borderLeft:'1px solid #55555a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '95%', height: '92%' }}>
                {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
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

// --- ESTILOS AUXILIARES ---
const colHeaderStyle = { padding: '18px', textAlign: 'center', fontSize: '18px', background: '#313134', borderRadius: '16px', border: '1px solid #55555a', color: '#9e9e9e', letterSpacing:'1.5px' };
const cardMetaStyle = { display:'flex', alignItems:'center', gap:'8px', color:'#d1d5db', fontSize:'13px', background:'#313134', padding:'8px 12px', borderRadius:'10px', border: '1px solid #55555a' };
const cobroBadgeStyle = { fontSize:'10px', background:'#fca5a520', color:'#fca5a5', padding:'6px 14px', borderRadius:'12px', border:'1px solid #fca5a550' };
const btnNovoStyle = { background:'#3f3f44', color:'#fff', border:'1px solid #55555a', padding:'12px 28px', borderRadius:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', fontSize: '15px' };
const dropdownStyle = { position:'absolute', top:'65px', right: 0, background:'#3f3f44', borderRadius:'22px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', zIndex:2000, width:'300px', border:'1px solid #55555a', overflow:'hidden' };
const dropdownItemStyle = { padding:'18px 25px', cursor:'pointer', borderBottom:'1px solid #55555a', fontSize:'15px', color: '#e2e8f0', transition:'0.2s' };

const btnBackStyle = { background: 'transparent', color: '#9e9e9e', border: '1px solid #55555a', padding: '10px 24px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' };
const infoGridStyle = { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'25px', marginTop:'45px' };
const infoBoxStyle = { background:'#2a2a2d', padding:'25px', borderRadius:'22px', border:'1px solid #55555a', display: 'flex', flexDirection: 'column', gap: '10px' };
const labelMStyle = { fontSize:'16px', color:'#9e9e9e', letterSpacing:'0.5px', textTransform:'uppercase' };
const valueMStyle = { fontSize: '22px', color: '#fff' };

const btnAnexoStyle = { padding:'15px 25px', background:'#2a2a2d', border:'1px solid #55555a', borderRadius:'15px', fontSize:'14px', textDecoration:'none', color:'#fff', display:'flex', alignItems:'center', gap:'12px' };
const btnActionGreen = { flex:1, color:'#fff', background:'#22c55e20', border:'1px solid #22c55e', padding:'20px', borderRadius:'18px', cursor:'pointer', display:'flex', alignItems:'center', gap:'15px', fontSize:'16px', justifyContent:'center' };
const btnActionBlue = { flex:1, color:'#fff', background:'#3b82f620', border:'1px solid #3b82f6', padding:'20px', borderRadius:'18px', cursor:'pointer', display:'flex', alignItems:'center', gap:'15px', fontSize:'16px', justifyContent:'center' };