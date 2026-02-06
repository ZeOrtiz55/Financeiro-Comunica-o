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
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Settings, RefreshCw, AlertCircle
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
            Fluxo Financeiro <br /> <span style={{ fontSize: '32px' }}>Nova Tratores</span>
        </h1>
    </div>
  )
}

// --- 2. FORMATADOR DE DATA (DD/MM/YYYY) ---
const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null') return '';
  const apenasData = dataStr.split(' ')[0];
  const partes = apenasData.split(/[-/]/);
  if (partes.length === 3) {
    if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`; 
    return `${partes[0]}/${partes[1]}/${partes[2]}`;
  }
  return dataStr;
};

function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=900" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

// --- 3. CHAT INTERNO ---
function ChatChamado({ registroId, tipo, userProfile }) {
  const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
  const colunaId = tipo === 'boleto' ? 'chamado_id' : tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : 'rh_id';
  
  useEffect(() => {
    if (!registroId || !userProfile?.id) return;
    supabase.from('mensagens_chat').select('*').eq(colunaId, registroId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
    const channel = supabase.channel(`chat_fin_k_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaId}=eq.${registroId}` }, payload => { 
      if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
    }).subscribe();
    return () => { supabase.removeChannel(channel) }
  }, [registroId, userProfile?.id, tipo, colunaId]);

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return;
    const texto = novaMsg; setNovaMsg('');
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
    const insertData = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }; insertData[colunaId] = registroId;
    await supabase.from('mensagens_chat').insert([insertData]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', color: '#000' }}>CONVERSA FINANCEIRA</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mensagens.map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
            <span style={{ fontSize: '8px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>{m.usuario_nome?.toUpperCase()}</span>
            <span style={{ fontSize: '14px' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', background: '#f8fafc', display: 'flex', gap: '10px' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} /><button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px' }}><Send size={18} /></button></form>
    </div>
  )
}

export default function KanbanFinanceiro() {
  const [chamados, setChamados] = useState([]); const [userProfile, setUserProfile] = useState(null);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null); const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); const [pesquisa, setPesquisa] = useState('');
  const [fileBoleto, setFileBoleto] = useState(null);
  const [fileJuros, setFileJuros] = useState(null); const [fileComprovante, setFileComprovante] = useState(null);
  const router = useRouter();

  const colunas = [
    { id: 'gerar_boleto', titulo: 'GERAR BOLETO' },
    { id: 'aguardando_vencimento', titulo: 'AGUARDANDO VENCIMENTO' },
    { id: 'pago', titulo: 'PAGO' },
    { id: 'vencido', titulo: 'VENCIDO' }
  ];

  const carregarDados = async () => {
    const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false});
    const hoje = new Date();
    let cardsProcessados = [];

    (data || []).forEach(c => {
      if (c.qtd_parcelas > 1 && c.datas_parcelas) {
        const datas = c.datas_parcelas.split(/[\s,]+/).filter(d => d.includes('-'));
        datas.forEach((dataParc, index) => {
          const numParc = index + 1;
          const vencParc = new Date(dataParc);
          let statusIndividual = c[`status_p${numParc}`] || 'aguardando_vencimento';
          let cobrancasIndividual = c[`recombrancas_qtd_p${numParc}`] || 0;
          
          if (vencParc < hoje && statusIndividual === 'aguardando_vencimento') {
            statusIndividual = 'pago';
            supabase.from('Chamado_NF').update({ [`status_p${numParc}`]: 'pago', [`tarefa_p${numParc}`]: 'Boleto Vencido: Anexar Juros' }).eq('id', c.id);
          }

          cardsProcessados.push({
            ...c, id_virtual: `${c.id}_p${numParc}`, nom_cliente: `${c.nom_cliente} (PARC ${numParc})`,
            vencimento_boleto: dataParc, valor_exibicao: c[`valor_parcela${numParc}`] || (c.valor_servico / c.qtd_parcelas).toFixed(2),
            status: statusIndividual, isChild: true, numParcelaRef: numParc, recombrancas_qtd: cobrancasIndividual
          });
        });
      } else {
        let statusBase = c.status;
        if (c.vencimento_boleto && new Date(c.vencimento_boleto) < hoje && statusBase === 'aguardando_vencimento') {
          statusBase = 'pago';
          supabase.from('Chamado_NF').update({ status: 'pago', tarefa: 'Boleto Vencido: Anexar Juros' }).eq('id', c.id);
        }
        cardsProcessados.push({ ...c, valor_exibicao: c.valor_servico, status: statusBase });
      }
    });
    setChamados(cardsProcessados);
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
      setUserProfile(prof); setLoading(false);
    }; init();
  }, [router]);

  useEffect(() => { if (userProfile) carregarDados(); }, [userProfile]);

  const handleUpdateField = async (id, field, value) => {
    const isChild = typeof id === 'string' && id.includes('_p');
    if (isChild) {
      const [idReal, pNum] = id.split('_p');
      await supabase.from('Chamado_NF').update({ [`${field}_p${pNum}`]: value }).eq('id', idReal);
    } else {
      await supabase.from('Chamado_NF').update({ [field]: value }).eq(id);
    }
    carregarDados();
  };

  const handleUpdateFile = async (id, field, file) => {
    if(!file) return;
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    try {
      await supabase.storage.from('anexos').upload(path, file);
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      await handleUpdateField(id, field, linkData.publicUrl);
      alert("Arquivo atualizado!");
    } catch (err) { alert("Erro: " + err.message); }
  };

  const handleGerarBoletoFaturamentoFinal = async (id) => {
    if (!fileBoleto) return alert("Anexe o boleto final.");
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const path = `boletos/${Date.now()}-${fileBoleto.name}`;
    await supabase.storage.from('anexos').upload(path, fileBoleto);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    
    if(typeof id === 'string' && id.includes('_p')) {
        const pNum = id.split('_p')[1];
        await supabase.from('Chamado_NF').update({ [`status_p${pNum}`]: 'enviar_cliente', [`tarefa_p${pNum}`]: 'Enviar Boleto para o Cliente', anexo_boleto: data.publicUrl }).eq(idReal);
    } else {
        await supabase.from('Chamado_NF').update({ status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl }).eq(id);
    }
    alert("Tarefa enviada para Pós-Vendas!"); setTarefaSelecionada(null); carregarDados();
  };

  const handleCobrarNovamente = async (id) => {
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const novaContagem = (tarefaSelecionada.recombrancas_qtd || 0) + 1;
    
    let updateData = {};
    if (typeof id === 'string' && id.includes('_p')) {
        const pNum = id.split('_p')[1];
        updateData = { [`status_p${pNum}`]: 'vencido', [`tarefa_p${pNum}`]: 'Cobrar Cliente Novamente', [`recombrancas_qtd_p${pNum}`]: novaContagem };
    } else {
        updateData = { status: 'vencido', tarefa: 'Cobrar Cliente Novamente', recombrancas_qtd: novaContagem, setor: 'Pós-Vendas' };
    }

    if (fileJuros) {
        const path = `juros/${Date.now()}-${fileJuros.name}`;
        await supabase.storage.from('anexos').upload(path, fileJuros);
        const { data } = supabase.storage.from('anexos').getPublicUrl(path);
        updateData.anexo_boleto_juros = data.publicUrl;
    }

    await supabase.from('Chamado_NF').update(updateData).eq(idReal);
    alert(`Tarefa de cobrança #${novaContagem} gerada para Pós-Vendas!`);
    setTarefaSelecionada(null); carregarDados();
  };

  const handleActionBoletoJuros = async (id) => {
    if (!fileJuros) return alert("Anexe o boleto com juros.");
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const path = `juros/${Date.now()}-${fileJuros.name}`;
    await supabase.storage.from('anexos').upload(path, fileJuros);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    
    if(typeof id === 'string' && id.includes('_p')) {
        const pNum = id.split('_p')[1];
        await supabase.from('Chamado_NF').update({ [`status_p${pNum}`]: 'vencido', [`tarefa_p${pNum}`]: 'Cobrar Cliente', anexo_boleto_juros: data.publicUrl }).eq(idReal);
    } else {
        await supabase.from('Chamado_NF').update({ status: 'vencido', tarefa: 'Cobrar Cliente', anexo_boleto_juros: data.publicUrl }).eq(id);
    }
    alert("Boleto com juros enviado!"); setTarefaSelecionada(null); carregarDados();
  };

  const handleActionConcluirPagamento = async (id) => {
    let updateData = { status: 'pago', tarefa: 'Pagamento Confirmado' };
    if (fileComprovante) {
      const path = `comprovantes/${Date.now()}-${fileComprovante.name}`;
      await supabase.storage.from('anexos').upload(path, fileComprovante);
      const { data } = supabase.storage.from('anexos').getPublicUrl(path);
      updateData.comprovante_pagamento = data.publicUrl;
    }
    if(typeof id === 'string' && id.includes('_p')) {
        const pNum = id.split('_p')[1];
        const childObj = { [`status_p${pNum}`]: 'pago', [`tarefa_p${pNum}`]: 'Pagamento Confirmado' };
        if(updateData.comprovante_pagamento) childObj.comprovante_pagamento = updateData.comprovante_pagamento;
        await supabase.from('Chamado_NF').update(childObj).eq(id.split('_p')[0]);
    } else {
        await supabase.from('Chamado_NF').update(updateData).eq(id);
    }
    alert("Pagamento concluído!"); setTarefaSelecionada(null); carregarDados();
  };

  const chamadosFiltrados = chamados.filter(c => c.nom_cliente?.toLowerCase().includes(pesquisa.toLowerCase()));

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: 'transparent' }}>
      <GeometricBackground />
      <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/kanban-financeiro" router={router} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} userProfile={userProfile} />

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', transition: '0.4s' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
          <h1 style={{ fontWeight: '400', fontSize:'42px', color:'#000', letterSpacing:'-1.5px' }}>Fluxo Financeiro</h1>
          <input type="text" placeholder="Pesquisar cliente..." value={pesquisa} onChange={e => setPesquisa(e.target.value)} style={{ padding: '15px 25px', width: '400px', borderRadius: '15px', border: '1px solid #cbd5e1', outline: 'none', background:'#fff', fontWeight:'400' }} />
        </header>

        <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', paddingBottom:'30px' }}>
          {colunas.map(col => (
            <div key={col.id} style={{ minWidth: '380px', flex: 1 }}>
              <h3 style={{ background: '#000', color: '#fff', padding: '20px', borderRadius: '15px', marginBottom: '25px', textAlign: 'center', fontWeight:'400', fontSize:'22px' }}>{col.titulo}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {chamadosFiltrados.filter(c => c.status === col.id).map(t => (
                  <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada(t)} className="kanban-card">
                    {/* CABEÇALHO DARK ESTILO HOME (Vermelho se Vencido) */}
                    <div style={{ background: t.status === 'vencido' ? '#ef4444' : '#1e293b', padding: '25px', color: '#fff' }}>
                      <h4 style={{ margin: 0, fontSize: '24px', fontWeight: '400' }}>{t.nom_cliente?.toUpperCase()}</h4>
                    </div>
                    <div style={{ padding: '25px', background:'#fff' }}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <label style={{color: '#94a3b8', fontSize:'11px'}}>MÉTODO: {t.forma_pagamento?.toUpperCase()}</label>
                        {t.status === 'vencido' && t.recombrancas_qtd > 0 && (
                            <div style={{background:'#fee2e2', color:'#ef4444', padding:'4px 10px', borderRadius:'8px', fontSize:'11px'}}>COBRADO {t.recombrancas_qtd}x</div>
                        )}
                      </div>
                      <p style={{fontSize:'28px', color:'#000', margin:'10px 0', fontWeight:'400'}}>R$ {t.valor_exibicao}</p>
                      
                      <div style={{ borderTop:'1px solid #eee', paddingTop:'15px', marginTop:'15px' }}>
                         <p style={{color:'#000', fontSize:'16px', fontWeight:'400'}}>VENCIMENTO: {formatarData(t.vencimento_boleto)}</p>
                         <p style={{color:'#000', fontSize:'14px', opacity:0.7, fontWeight:'400'}}>ID: #{t.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow:'0 50px 100px rgba(0,0,0,0.3)' }}>
            <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto' }}>
              <button onClick={() => setTarefaSelecionada(null)} className="btn-back"><ArrowLeft size={18}/> VOLTAR</button>
              
              <h2 style={{fontSize:'72px', color:'#000', fontWeight:'400', lineHeight:'1.1', margin:'20px 0'}}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
              <div style={{display:'flex', gap:'60px', marginBottom:'40px', alignItems:'flex-end'}}>
                 <div><label>FORMA DE PAGAMENTO</label><p style={{fontSize:'36px', color:'#2563eb', fontWeight:'400'}}>{tarefaSelecionada.forma_pagamento?.toUpperCase()}</p></div>
                 <div><label>VALOR TOTAL</label><p style={{fontSize:'56px', fontWeight:'400'}}>R$ {tarefaSelecionada.valor_exibicao}</p></div>
                 <div><label>VENCIMENTO</label><p style={{fontSize:'36px', color:'#ef4444', fontWeight:'400'}}>{formatarData(tarefaSelecionada.vencimento_boleto)}</p></div>
              </div>
              
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'25px', border:'1px solid #e2e8f0', padding:'35px', borderRadius:'30px', background:'#fcfcfc' }}>
                 <div><label>ID PROCESSO</label><p style={{fontSize:'20px', fontWeight:'400'}}>#{tarefaSelecionada.id}</p></div>
                 <div><label>NF SERVIÇO</label><input style={inputStyle} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'num_nf_servico', e.target.value)} /></div>
                 <div><label>NF PEÇA</label><input style={inputStyle} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'num_nf_peca', e.target.value)} /></div>
                 <div><label>QTD PARCELAS</label><p style={{fontSize:'20px', fontWeight:'400'}}>{tarefaSelecionada.qtd_parcelas || 1}x</p></div>
                 <div><label>COBRANÇAS REALIZADAS</label><p style={{fontSize:'20px', fontWeight:'400'}}>{tarefaSelecionada.recombrancas_qtd || 0} vezes</p></div>
                 <div style={{gridColumn:'span 3'}}><label>DATAS DAS PARCELAS</label><p style={{background:'#f1f5f9', padding:'15px', borderRadius:'15px', fontSize:'18px', fontWeight:'400'}}>{tarefaSelecionada.datas_parcelas || 'N/A'}</p></div>
                 <div style={{gridColumn:'span 3'}}><label>OBSERVAÇÃO</label><textarea style={{...inputStyle, height:'120px'}} defaultValue={tarefaSelecionada.obs} onBlur={e => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'obs', e.target.value)} /></div>
              </div>

              {/* FASE: GERAR BOLETO */}
              {tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{ marginTop: '40px', padding: '40px', background: '#f0f9ff', borderRadius: '30px', border: '1px solid #bae6fd' }}>
                   <label style={{color:'#0369a1', fontSize:'14px'}}>GERAR TAREFA: ENVIAR BOLETO AO CLIENTE</label>
                   <div style={{display:'flex', gap:'20px', marginTop:'20px'}}>
                      <label style={{flex:1, background:'#fff', border:'2px dashed #3b82f6', borderRadius:'20px', padding:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                         <Upload size={32} color="#3b82f6" style={{marginRight:'15px'}}/>
                         <span style={{fontSize:'18px', color:'#1d4ed8', fontWeight:'400'}}>{fileBoleto ? fileBoleto.name : 'ANEXAR BOLETO FINAL'}</span>
                         <input type="file" hidden onChange={e => setFileBoleto(e.target.files[0])} />
                      </label>
                      <button onClick={() => handleGerarBoletoFaturamentoFinal(tarefaSelecionada.id_virtual || tarefaSelecionada.id)} style={{background:'#0f172a', color:'#fff', border:'none', padding:'0 40px', borderRadius:'20px', cursor:'pointer', fontSize:'16px', fontWeight:'400'}}>Gerar Tarefa Pós-Vendas</button>
                   </div>
                </div>
              )}

              {/* FASE: PAGO (PARA ANEXAR JUROS) */}
              {tarefaSelecionada.status === 'pago' && (
                <div style={{ marginTop: '40px', padding: '40px', background: '#fff7ed', borderRadius: '30px', border: '1px solid #fed7aa' }}>
                   <label style={{color:'#c2410c', fontSize:'14px'}}>VENCIDO: ANEXAR NOVO BOLETO COM JUROS</label>
                   <div style={{display:'flex', gap:'20px', marginTop:'20px'}}>
                      <label style={{flex:1, background:'#fff', border:'2px dashed #f97316', borderRadius:'20px', padding:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                         <Upload size={32} color="#f97316" style={{marginRight:'15px'}}/>
                         <span style={{fontSize:'18px', color:'#c2410c', fontWeight:'400'}}>{fileJuros ? fileJuros.name : 'CLIQUE PARA ANEXAR O BOLETO COM JUROS'}</span>
                         <input type="file" hidden onChange={e => setFileJuros(e.target.files[0])} />
                      </label>
                      <button onClick={() => handleActionBoletoJuros(tarefaSelecionada.id_virtual || tarefaSelecionada.id)} style={{background:'#000', color:'#fff', padding:'0 40px', borderRadius:'20px', cursor:'pointer', fontSize:'16px', fontWeight:'400'}}>Mover para Vencido e Cobrar</button>
                   </div>
                </div>
              )}

              {/* FASE: VENCIDO */}
              {tarefaSelecionada.status === 'vencido' && (
                <div style={{display:'flex', flexDirection:'column', gap:'20px', marginTop:'40px'}}>
                  {/* BOTÃO COBRAR NOVAMENTE / RENOVAR */}
                  <div style={{ padding: '40px', background: '#fff1f2', borderRadius: '30px', border: '1px solid #fecdd3' }}>
                    <label style={{color:'#be123c', fontSize:'14px'}}>RENOVAR BOLETO E SOLICITAR NOVA COBRANÇA</label>
                    <div style={{display:'flex', gap:'20px', marginTop:'20px'}}>
                        <label style={{flex:1, background:'#fff', border:'2px dashed #e11d48', borderRadius:'20px', padding:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                            <Upload size={32} color="#e11d48" style={{marginRight:'15px'}}/>
                            <span style={{fontSize:'18px', color:'#e11d48', fontWeight:'400'}}>{fileJuros ? fileJuros.name : 'ANEXAR NOVO BOLETO RENOVADO (OPCIONAL)'}</span>
                            <input type="file" hidden onChange={e => setFileJuros(e.target.files[0])} />
                        </label>
                        <button onClick={() => handleCobrarNovamente(tarefaSelecionada.id_virtual || tarefaSelecionada.id)} style={{background:'#e11d48', color:'#fff', border:'none', padding:'0 40px', borderRadius:'20px', cursor:'pointer', fontSize:'16px', fontWeight:'400'}}>Gerar Tarefa: Cobrar Novamente o Cliente</button>
                    </div>
                  </div>

                  {/* BOTÃO CONCLUIR */}
                  <div style={{ padding: '40px', background: '#f0fdf4', borderRadius: '30px', border: '1px solid #bbf7d0' }}>
                    <label style={{color:'#166534', fontSize:'14px'}}>PAGAMENTO RECEBIDO</label>
                    <div style={{display:'flex', gap:'20px', marginTop:'20px'}}>
                        <label style={{flex:1, background:'#fff', border:'2px dashed #22c55e', borderRadius:'20px', padding:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                            <Upload size={32} color="#22c55e" style={{marginRight:'15px'}}/>
                            <span style={{fontSize:'18px', color:'#166534', fontWeight:'400'}}>{fileComprovante ? fileComprovante.name : 'ANEXAR COMPROVANTE'}</span>
                            <input type="file" hidden onChange={e => setFileComprovante(e.target.files[0])} />
                        </label>
                        <button onClick={() => handleActionConcluirPagamento(tarefaSelecionada.id_virtual || tarefaSelecionada.id)} style={{background:'#166534', color:'#fff', border:'none', padding:'0 40px', borderRadius:'20px', cursor:'pointer', fontSize:'16px', fontWeight:'400'}}>Pagamento Concluido - Mover para Pago</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{marginTop:'40px'}}>
                <label style={{marginBottom:'20px'}}>ANEXOS DO PROCESSO (CLIQUE NO ÍCONE PARA TROCAR)</label>
                <div style={{display:'flex', gap:'15px', flexWrap:'wrap'}}>
                   <div className="btn-file-mod"><label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'}}><RefreshCw size={16}/> NF SERV <input type="file" hidden onChange={e => handleUpdateFile(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_nf_servico', e.target.files[0])} /></label>{tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank"><Eye size={16}/></a>}</div>
                   <div className="btn-file-mod"><label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'}}><RefreshCw size={16}/> NF PEÇA <input type="file" hidden onChange={e => handleUpdateFile(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_nf_peca', e.target.files[0])} /></label>{tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank"><Eye size={16}/></a>}</div>
                   {tarefaSelecionada.anexo_boleto && <div className="btn-file-mod"><label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'}}><RefreshCw size={16}/> BOLETO <input type="file" hidden onChange={e => handleUpdateFile(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_boleto', e.target.files[0])} /></label><a href={tarefaSelecionada.anexo_boleto} target="_blank"><Eye size={16}/></a></div>}
                </div>
              </div>
            </div>
            <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft:'1px solid #e2e8f0' }}>
              {userProfile && <ChatChamado registroId={tarefaSelecionada?.id} tipo="boleto" userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; }
        .kanban-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 20px; cursor: pointer; transition: 0.3s ease; overflow: hidden; }
        .kanban-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .btn-back { background: #000; color: #fff; border: none; padding: 15px 35px; border-radius: 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; }
        label { display: block; font-size: 11px; font-weight: 900 !important; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        p { margin: 0; color: #000; }
        .btn-file-mod { padding: 15px 25px; background: #fff; border: 1px solid #cbd5e1; border-radius: 15px; display: flex; align-items: center; gap: 10px; font-size: 14px; text-decoration: none; color: #000; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '18px', border: '1px solid #cbd5e1', borderRadius: '15px', fontFamily: 'Montserrat', fontSize: '18px', outline: 'none', background: '#fff' };