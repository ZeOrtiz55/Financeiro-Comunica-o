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
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Settings, RefreshCw, AlertCircle, Tag, Lock, DollarSign
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO (ESTILO ATUALIZADO) ---
function LoadingScreen() {
 return (
  <div style={{ position: 'fixed', inset: 0, background: '#212124', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
    <h1 style={{ color: '#f8fafc', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
      Sincronizando Kanban <br /> <span style={{ fontSize: '32px', fontWeight:'400', color: '#9e9e9e' }}>Nova Tratores</span>
    </h1>
  </div>
 )
}

// --- 2. FORMATADOR DE DATA PT-BR ---
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
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#2a2a2d', pointerEvents: 'none' }}>
   <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(42, 42, 45, 0.4) 100%)' }}></div>
  </div>
 )
}

// --- 3. CHAT INTERNO (EFEITO FLUTUANTE) ---
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
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #55555a', borderRadius: '24px', overflow: 'hidden', background: '#242427', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
   <div style={{ padding: '18px 25px', background: '#3f3f44', borderBottom: '1px solid #55555a', fontSize: '13px', color: '#9e9e9e', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
   <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {mensagens.map((m) => (
     <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#3b82f625' : '#3f3f44', color: '#fff', padding: '14px 20px', borderRadius: '20px', maxWidth: '85%', border: '1px solid #55555a' }}>
      <span style={{ fontSize: '9px', opacity: 0.6, display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>{m.usuario_nome}</span>
      <span style={{ fontSize: '16px', lineHeight: '1.5' }}>{m.texto}</span>
     </div>
    ))}
   </div>
   <form onSubmit={enviar} style={{ padding: '20px', background: '#3f3f44', display: 'flex', gap: '12px' }}>
     <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #55555a', background: '#2a2a2d', color: '#fff', outline: 'none', fontSize: '16px' }} />
     <button style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '14px', width: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={20} /></button>
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
    let cardsProcessados = [];

    for (const c of (data || [])) {
     if (c.qtd_parcelas > 1 && c.datas_parcelas) {
      const datas = c.datas_parcelas.split(/[\s,]+/).filter(d => d.includes('-'));
      for (let index = 0; index < datas.length; index++) {
       const dataParc = datas[index];
       const numParc = index + 1;
       const vencParc = new Date(dataParc); vencParc.setHours(0,0,0,0);
       let st = c[`status_p${numParc}`] || 'gerar_boleto';
       
       // LÓGICA: SE VENCER, VAI PARA PAGO (SOLICITADO)
       if (st === 'aguardando_vencimento' && vencParc < hoje) st = 'pago';

       cardsProcessados.push({
        ...c, id_virtual: `${c.id}_p${numParc}`, nom_cliente: `${c.nom_cliente} (P${numParc})`,
        vencimento_boleto: dataParc, valor_exibicao: c[`valor_parcela${numParc}`] || (c.valor_servico / c.qtd_parcelas).toFixed(2),
        status: st, isChild: true, pNum: numParc, gTipo: 'boleto', 
        recombrancas_qtd: c[`recombrancas_qtd_p${numParc}`] || 0,
        tarefa: c[`tarefa_p${numParc}`],
        anexo_boleto: c[`anexo_boleto_p${numParc}`],
        comprovante_pagamento: c[`comprovante_pagamento_p${numParc}`]
       });
      }
     } else {
      let st = c.status || 'gerar_boleto';
      const venc = c.vencimento_boleto ? new Date(c.vencimento_boleto) : null;
      if (venc) venc.setHours(0,0,0,0);
      
      // LÓGICA: SE VENCER, VAI PARA PAGO (SOLICITADO)
      if (st === 'aguardando_vencimento' && venc && venc < hoje) st = 'pago';

      cardsProcessados.push({ 
        ...c, 
        valor_exibicao: c.valor_servico, 
        status: st, 
        gTipo: 'boleto', 
        recombrancas_qtd: c.recombrancas_qtd || 0 
      });
     }
    }
    setChamados(cardsProcessados);
  } catch (err) { console.error(err); }
 }

 useEffect(() => {
    const channel = supabase
      .channel('kanban_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(channel) };
 }, []);

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
    const isChild = String(id).includes('_p');
    const idReal = isChild ? id.split('_p')[0] : id;
    const pNum = isChild ? id.split('_p')[1] : null;
    
    let col = field;
    if (isChild && !['num_nf_servico', 'num_nf_peca', 'obs'].includes(field)) {
        col = `${field}_p${pNum}`;
    }
    
    await supabase.from('Chamado_NF').update({ [col]: value }).eq('id', idReal);
    carregarDados();
 };

 const handleUpdateFileDirect = async (id, field, file) => {
    if(!file) return;
    try {
      const isChild = String(id).includes('_p');
      const idReal = isChild ? id.split('_p')[0] : id;
      const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      
      const pNum = isChild ? id.split('_p')[1] : null;
      let col = field;
      
      if (isChild && ['anexo_boleto', 'comprovante_pagamento'].includes(field)) {
          col = `${field}_p${pNum}`;
      } else if (isChild && !['num_nf_servico', 'num_nf_peca', 'obs'].includes(field)) {
          col = `${field}_p${pNum}`;
      }
      
      await supabase.from('Chamado_NF').update({ [col]: linkData.publicUrl }).eq('id', idReal);
      alert("Arquivo atualizado!");
      carregarDados();
      if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: linkData.publicUrl }));
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleActionMoveStatus = async (t, newStatus) => {
    const isChild = !!t.id_virtual;
    const idReal = t.id;
    const pNum = isChild ? t.id_virtual.split('_p')[1] : null;
    
    let updateData = isChild ? { [`status_p${pNum}`]: newStatus } : { status: newStatus };

    const { error } = await supabase.from('Chamado_NF').update(updateData).eq('id', idReal);
    if (!error) {
        alert(newStatus === 'concluido' ? "Card Concluído!" : "Card movido!");
        carregarDados();
        setTarefaSelecionada(prev => ({ ...prev, status: newStatus }));
    }
 };

 const handleActionCobrarCliente = async (t) => {
    const isChild = !!t.id_virtual;
    const idReal = t.id;
    const pNum = isChild ? t.id_virtual.split('_p')[1] : null;
    const currentRec = t.recombrancas_qtd || 0;
    const newVal = currentRec + 1;

    let updateData = isChild ? { 
        [`tarefa_p${pNum}`]: 'Cobrar Cliente (Recobrança)', 
        [`recombrancas_qtd_p${pNum}`]: newVal 
    } : { 
        tarefa: 'Cobrar Cliente (Recobrança)', 
        recombrancas_qtd: newVal,
        setor: 'Pós-Vendas'
    };

    const { error } = await supabase.from('Chamado_NF').update(updateData).eq('id', idReal);
    if (!error) {
        alert("Recobrança enviada ao Pós-Vendas!");
        setTarefaSelecionada(null);
        carregarDados();
    }
 };

 const handleGerarBoletoFaturamentoFinal = async (id) => {
  if (!fileBoleto) return alert("Anexe o arquivo.");
  const isChild = String(id).includes('_p');
  const idReal = isChild ? id.split('_p')[0] : id;
  const pNum = isChild ? id.split('_p')[1] : null;

  const path = `boletos/${Date.now()}-${fileBoleto.name}`;
  await supabase.storage.from('anexos').upload(path, fileBoleto);
  const { data } = supabase.storage.from('anexos').getPublicUrl(path);
  
  const updateData = isChild ? 
    { [`status_p${pNum}`]: 'enviar_cliente', [`anexo_boleto_p${pNum}`]: data.publicUrl } : 
    { status: 'enviar_cliente', anexo_boleto: data.publicUrl };

  await supabase.from('Chamado_NF').update(updateData).eq('id', idReal);
  setTarefaSelecionada(null); carregarDados();
 };

 const chamadosFiltrados = chamados.filter(c => {
    const matchCliente = c.nom_cliente?.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchNF = (c.num_nf_servico?.toString().includes(filtroNF) || c.num_nf_peca?.toString().includes(filtroNF));
    const matchData = filtroData ? c.vencimento_boleto === filtroData : true;
    return matchCliente && matchNF && matchData;
 });

 if (loading) return <LoadingScreen />

 return (
  <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Montserrat, sans-serif', background: '#2a2a2d', overflow: 'hidden' }}>
   <GeometricBackground />
   <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/kanban-financeiro" router={router} handleLogout={handleLogout} userProfile={userProfile} />

   <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, display: 'flex', flexDirection: 'column', transition: '0.4s ease', height: '100vh', overflow: 'hidden' }}>
    <header style={{ padding: '50px 50px 30px 50px' }}>
     <div style={{ display:'flex', gap:'15px', alignItems:'center', justifyContent: 'flex-start', marginBottom: '25px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
            <Search size={18} style={iconFilterStyle} />
            <input type="text" placeholder="Filtrar por Cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={inputFilterStyle} />
        </div>
        <div style={{ position: 'relative', width: '160px' }}>
            <Hash size={18} style={iconFilterStyle} />
            <input type="text" placeholder="Nº Nota..." value={filtroNF} onChange={e => setFiltroNF(e.target.value)} style={inputFilterStyle} />
        </div>
        <div style={{ position: 'relative', width: '200px' }}>
            <Calendar size={18} style={iconFilterStyle} />
            <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={inputFilterStyle} />
            {filtroData && <X size={14} onClick={() => setFiltroData('')} style={{position:'absolute', right: '12px', top: '50%', transform:'translateY(-50%)', cursor:'pointer', color:'#fca5a5'}}/>}
        </div>
     </div>
     <h1 style={{ fontWeight: '300', fontSize:'52px', color:'#f8fafc', letterSpacing:'-2px', margin: 0 }}>Fluxo Financeiro</h1>
    </header>

    <div style={{ flex: 1, display: 'flex', gap: '25px', overflowX: 'auto', overflowY: 'hidden', padding: '0 50px 40px 50px', boxSizing: 'border-box' }}>
     {colunas.map(col => (
      <div key={col.id} style={{ minWidth: '420px', flex: 1, display: 'flex', flexDirection: 'column' }}>
       <h3 style={{ background: '#313134', color: '#9e9e9e', padding: '20px', borderRadius: '16px', marginBottom: '25px', textAlign: 'center', fontWeight:'400', fontSize:'16px', letterSpacing:'1px', border: '1px solid #55555a', flexShrink: 0 }}>{col.titulo}</h3>
       
       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '5px' }}>
        {chamadosFiltrados.filter(c => col.id === 'pago' ? (c.status === 'pago' || c.status === 'concluido') : c.status === col.id).map(t => (
         <div key={t.id_virtual || t.id} className="kanban-card" style={{ opacity: t.status === 'concluido' ? 0.6 : 1 }}>
          <div onClick={() => setTarefaSelecionada(t)} style={{ 
            background: t.status === 'vencido' ? '#fca5a525' : (t.status === 'pago' || t.status === 'concluido' ? '#4ade8025' : '#313134'), 
            padding: '25px', borderBottom: '1px solid #55555a', cursor: 'pointer'
          }}>
            <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '400', color: t.status === 'vencido' ? '#fca5a5' : (t.status === 'pago' || t.status === 'concluido' ? '#4ade80' : '#fff') }}>
             {t.nom_cliente?.toUpperCase()} {t.status === 'concluido' && "✓"}
            </h4>
          </div>
          <div onClick={() => setTarefaSelecionada(t)} style={{ padding: '25px', background:'#4e4e52', cursor: 'pointer' }}>
             <div style={cardInfoStyle}><CreditCard size={16}/> <span>FORMA:</span> {t.forma_pagamento?.toUpperCase()}</div>
             <div style={cardInfoStyle}><Calendar size={16}/> <span>VENC:</span> {formatarDataBR(t.vencimento_boleto)}</div>
             <div style={{fontSize:'32px', fontWeight:'400', margin:'15px 0', color:'#fff'}}>R$ {t.valor_exibicao}</div>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
     <div style={{ background: '#3f3f44', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.6)', border: '1px solid #55555a' }}>
      
      <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto' }}>
        <button onClick={() => setTarefaSelecionada(null)} className="btn-back"><ArrowLeft size={18}/> VOLTAR AO PAINEL</button>
        <h2 style={{fontSize:'64px', fontWeight:'300', margin:'25px 0', letterSpacing:'-3px', color:'#fff', lineHeight: '1'}}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
        
        <div style={{display:'flex', gap:'30px', marginBottom:'45px'}}>
          <div style={fieldBoxModal}><label style={labelModalStyle}>Condição</label><p style={pModalStyle}>{tarefaSelecionada.forma_pagamento?.toUpperCase()}</p></div>
          <div style={fieldBoxModal}><label style={labelModalStyle}>Valor Aberto</label><p style={{...pModalStyle, fontSize:'32px'}}>R$ {tarefaSelecionada.valor_exibicao}</p></div>
          <div style={fieldBoxModal}><label style={labelModalStyle}>Vencimento</label><p style={{...pModalStyle, color: tarefaSelecionada.status === 'vencido' ? '#fca5a5' : '#fff'}}>{formatarDataBR(tarefaSelecionada.vencimento_boleto)}</p></div>
          {tarefaSelecionada.status === 'vencido' && (
            <div style={{...fieldBoxModal, border: '1px solid #fca5a550'}}><label style={{...labelModalStyle, color: '#fca5a5'}}>Recobranças</label><p style={{...pModalStyle, color:'#ef4444', fontSize: '32px'}}>{tarefaSelecionada.recombrancas_qtd}x</p></div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px', background:'#2a2a2d', padding:'45px', borderRadius:'30px', border:'1px solid #55555a' }}>
          <div style={fieldBoxInner}>
            <label style={labelModalStyle}>Nota de Serviço</label>
            <input style={inputStyleModal} disabled={tarefaSelecionada.status === 'concluido'} defaultValue={tarefaSelecionada.num_nf_servico} placeholder="Sem NF de serviços" onBlur={e => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'num_nf_servico', e.target.value)} />
          </div>
          <div style={fieldBoxInner}>
            <label style={labelModalStyle}>Nota de Peça</label>
            <input style={inputStyleModal} disabled={tarefaSelecionada.status === 'concluido'} defaultValue={tarefaSelecionada.num_nf_peca} placeholder="Sem NF de Peças" onBlur={e => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'num_nf_peca', e.target.value)} />
          </div>
          <div style={{gridColumn:'span 2', ...fieldBoxInner}}>
            <label style={labelModalStyle}>Observações Financeiras</label>
            <textarea style={{...inputStyleModal, height:'130px', resize: 'none'}} disabled={tarefaSelecionada.status === 'concluido'} defaultValue={tarefaSelecionada.obs} placeholder="Sem observações registradas" onBlur={e => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'obs', e.target.value)} />
          </div>
        </div>

        <div style={{marginTop:'40px'}}>
            <label style={labelModalStyle}>Anexos</label>
            <div style={{display:'flex', gap:'15px', flexWrap:'wrap', marginTop:'15px'}}>
                <AttachmentTag label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_nf_servico', file)} disabled={tarefaSelecionada.status === 'concluido'} />
                <AttachmentTag label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_nf_peca', file)} disabled={tarefaSelecionada.status === 'concluido'} />
                <AttachmentTag label="BOLETO" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_boleto', file)} disabled={tarefaSelecionada.status === 'concluido'} />
                
                {/* COMPROVANTE: APARECE SOMENTE NO VENCIDO (SOLICITADO) */}
                {tarefaSelecionada.status === 'vencido' && (
                  <AttachmentTag label="COMPROVANTE" fileUrl={tarefaSelecionada.comprovante_pagamento} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'comprovante_pagamento', file)} disabled={false} />
                )}
            </div>
        </div>

        {/* --- ÁREA DE AÇÕES --- */}
        <div style={{marginTop:'50px', display:'flex', gap:'20px'}}>
          {tarefaSelecionada.status === 'gerar_boleto' && (
            <div style={{flex: 1, background:'#242427', padding:'40px', borderRadius:'28px', border:'1px solid #3b82f650'}}>
               <label style={{...labelModalStyle, color:'#60a5fa', fontSize: '18px'}}>ANEXAR BOLETO FINAL</label>
               <div style={{display:'flex', gap:'25px', marginTop:'25px', alignItems: 'center'}}>
                  <input type="file" onChange={e => setFileBoleto(e.target.files[0])} style={{fontSize: '16px', color: '#bdbdbd'}} />
                  <button onClick={() => handleGerarBoletoFaturamentoFinal(tarefaSelecionada.id_virtual || tarefaSelecionada.id)} style={{background:'#3b82f6', color:'#fff', padding:'16px 35px', border:'none', borderRadius:'14px', cursor:'pointer', fontSize: '16px'}}>Processar Boleto</button>
               </div>
            </div>
          )}

          {/* FASE PAGO: FICA COM OS DOIS BOTÕES */}
          {tarefaSelecionada.status === 'pago' && (
            <>
                <div className="tooltip-container" style={{flex: 1}}>
                    <button onClick={() => { if(window.confirm("Mover este card para a fase VENCIDO?")) handleActionMoveStatus(tarefaSelecionada, 'vencido') }} style={btnActionRed}>
                        <AlertCircle size={22}/> MOVER PARA VENCIDO
                    </button>
                    <div className="tooltip-box">Mover para a fase vencido.</div>
                </div>

                <div className="tooltip-container" style={{flex: 1}}>
                    <button onClick={() => { if(window.confirm("Deseja concluir este card? Ele ficará bloqueado.")) handleActionMoveStatus(tarefaSelecionada, 'concluido') }} style={btnActionGreen}>
                        <CheckCheck size={22}/> CONCLUIR CARD
                    </button>
                    <div className="tooltip-box">Finalizar processo.</div>
                </div>
            </>
          )}

          {tarefaSelecionada.status === 'vencido' && (
            <>
                <div style={{flex: 1.5, background: '#242427', padding: '30px', borderRadius: '22px', border: '1px solid #fca5a540', display:'flex', flexDirection:'column', gap: '20px'}}>
                    <div style={{display:'flex', gap:'20px', alignItems: 'center'}}>
                        <div className="tooltip-container" style={{flex: 1}}>
                            <button onClick={() => handleActionCobrarCliente(tarefaSelecionada)} style={{...btnActionBlue, background: 'rgba(59, 130, 246, 0.1)'}}>
                                <DollarSign size={22}/> COBRAR CLIENTE
                            </button>
                            <div className="tooltip-box">Gera tarefa para o Pós-Vendas.</div>
                        </div>
                        <div style={{flex: 1.2}}>
                            <AttachmentTag 
                                label="NOVO BOLETO" 
                                fileUrl={tarefaSelecionada.anexo_boleto} 
                                onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'anexo_boleto', file)} 
                                tooltip="Substitua o boleto vencido."
                            />
                        </div>
                    </div>
                </div>

                <div className="tooltip-container" style={{flex: 0.8}}>
                    <button onClick={() => { if(window.confirm("Confirmar Pagamento Realizado?")) handleActionMoveStatus(tarefaSelecionada, 'concluido') }} style={btnActionGreen}>
                        <CheckCircle size={22}/> PAGAMENTO REALIZADO
                    </button>
                    <div className="tooltip-box">Mover para concluído.</div>
                </div>
            </>
          )}

          {tarefaSelecionada.status === 'concluido' && (
             <div style={{flex: 1, background:'rgba(74, 222, 128, 0.1)', padding:'30px', borderRadius:'22px', border:'1px solid #4ade80', textAlign:'center'}}>
                <span style={{color:'#4ade80', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}><Lock size={20}/> PROCESSO CONCLUÍDO E BLOQUEADO</span>
             </div>
          )}
        </div>
      </div>

      <div style={{ flex: '0.8', padding: '40px', background: '#2a2a2d', borderLeft:'1px solid #55555a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ width: '95%', height: '92%' }}>
        {userProfile && <ChatChamado registroId={tarefaSelecionada?.id} tipo="boleto" userProfile={userProfile} />}
       </div>
      </div>

     </div>
    </div>
   )}

   <style jsx global>{`
    * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; box-sizing: border-box; }
    .kanban-card { background: #313134; border: 1px solid #55555a; border-radius: 20px; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; margin-bottom: 5px; flex-shrink: 0; }
    .kanban-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.6); border-color: #71717a; }
    .btn-back { background: transparent; color: #9e9e9e; border: 1px solid #55555a; padding: 12px 28px; border-radius: 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size:14px; transition: 0.2s; }
    .btn-back:hover { background: #55555a; color: #fff; }
    
    .tooltip-container { position: relative; display: flex; }
    .tooltip-box { 
        position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
        background: #000; color: #fff; padding: 15px 20px; border-radius: 12px;
        font-size: 15px; width: 320px; text-align: center; pointer-events: none;
        opacity: 0; transition: 0.3s; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .tooltip-container:hover .tooltip-box { opacity: 1; bottom: 120%; }

    ::-webkit-scrollbar { width: 8px; height: 12px; }
    ::-webkit-scrollbar-track { background: #2a2a2d; }
    ::-webkit-scrollbar-thumb { background: #3f3f44; border-radius: 10px; border: 2px solid #2a2a2d; }
    ::-webkit-scrollbar-thumb:hover { background: #55555a; }
   `}</style>
  </div>
 )
}

// --- COMPONENTE TAG DE ANEXO ---
function AttachmentTag({ label, fileUrl, onUpload, disabled = false, tooltip = "" }) {
    const fileInputRef = useRef(null);
    return (
        <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', background: '#3f3f44', border: '1px solid #55555a', borderRadius: '12px', overflow: 'hidden', width:'100%', marginBottom: '10px' }}>
            <span style={{ padding: '10px 15px', fontSize: '13px', color: fileUrl ? '#4ade80' : '#9e9e9e', borderRight: '1px solid #55555a', flex: 1 }}>{label}</span>
            <div style={{ display: 'flex' }}>
                {fileUrl && (
                    <button title="Ver arquivo" onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn}><Eye size={18} /></button>
                )}
                {!disabled && (
                    <>
                        <button title="Substituir/Anexar" onClick={() => fileInputRef.current.click()} style={miniActionBtn}><RefreshCw size={18} /></button>
                        <input type="file" ref={fileInputRef} hidden onChange={(e) => onUpload(e.target.files[0])} />
                    </>
                )}
            </div>
            {tooltip && <div className="tooltip-box">{tooltip}</div>}
        </div>
    );
}

const btnActionRed = { width: '100%', background: 'rgba(252, 165, 165, 0.1)', color: '#fca5a5', border: '1px solid #fca5a5', padding: '20px', borderRadius: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', transition: '0.3s' };
const btnActionGreen = { width: '100%', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', border: '1px solid #4ade80', padding: '20px', borderRadius: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', transition: '0.3s' };
const btnActionBlue = { width: '100%', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid #60a5fa', padding: '20px', borderRadius: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', transition: '0.3s' };
const inputFilterStyle = { padding: '12px 15px 12px 45px', width: '100%', borderRadius: '12px', border: '1px solid #55555a', outline: 'none', background:'#3f3f44', fontWeight:'400', color:'#fff', fontSize: '15px', boxSizing: 'border-box' };
const iconFilterStyle = { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9e9e9e', zIndex: 10 };
const highlightIdStyle = { fontSize: '18px', color: '#94a3b8', background: '#3f3f44', padding: '6px 15px', borderRadius: '10px', display: 'inline-block', border: '1px solid #55555a', marginTop: '10px' };
const cardInfoStyle = { display:'flex', alignItems:'center', gap:'12px', color:'#d1d5db', fontSize:'15px', marginBottom:'10px' };
const inputStyleModal = { width: '100%', padding: '20px', border: '1px solid #55555a', borderRadius: '15px', outline: 'none', background:'#242427', color:'#fff', fontSize: '20px', boxSizing: 'border-box' };
const labelModalStyle = { fontSize:'18px', color:'#9e9e9e', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'15px', display:'block' };
const pModalStyle = { fontSize:'28px', color:'#fff', margin:'0' };
const fieldBoxModal = { border: '1px solid #55555a', padding: '25px', borderRadius: '22px', background: '#2a2a2d', flex: 1 };
const fieldBoxInner = { padding: '10px', borderRadius: '14px', background: 'transparent' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '10px 15px', color: '#fff', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' };