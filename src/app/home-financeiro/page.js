'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// ÍCONES
import { 
 Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
 CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
 Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Edit3, RefreshCw, AlertCircle, Trash, DollarSign
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO (ESTILO CLARO SOFT) ---
function LoadingScreen() {
 return (
  <div style={{ position: 'fixed', inset: 0, background: '#f5f6fa', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
    <h1 style={{ color: '#2f3640', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '32px', letterSpacing: '6px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
        Painel Financeiro <br /> 
        <span style={{ fontWeight: '300', fontSize: '40px', color: '#718093' }}>Nova Tratores</span>
    </h1>
  </div>
 )
}

// --- 2. FORMATADOR DE DATA ---
const formatarData = (dataStr) => {
 if (!dataStr || dataStr === 'null' || dataStr.trim() === '') return 'N/A';
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
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f5f6fa', pointerEvents: 'none' }}>
   <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(47, 54, 64, 0.02) 0%, rgba(113, 128, 147, 0.02) 100%)' }}></div>
  </div>
 )
}

// --- 3. CHAT INTERNO ---
function ChatChamado({ registroId, tipo, userProfile }) {
 const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
 const colunaLink = tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : tipo === 'rh' ? 'rh_id' : 'chamado_id';

 useEffect(() => {
  if (!registroId || !userProfile?.id) return;
  supabase.from('mensagens_chat').select('*').eq(colunaLink, registroId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
  const channel = supabase.channel(`chat_h_fin_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaLink}=eq.${registroId}` }, payload => { 
   if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
  }).subscribe();
  return () => { supabase.removeChannel(channel) }
 }, [registroId, userProfile?.id, colunaLink]);

 const enviar = async (e) => {
  e.preventDefault(); if (!novaMsg.trim()) return;
  const texto = novaMsg; setNovaMsg('');
  setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
  const payload = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id };
  payload[colunaLink] = registroId;
  await supabase.from('mensagens_chat').insert([payload]);
 }
 return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #dcdde1', borderRadius: '24px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 10px 30px rgba(47, 54, 64, 0.05)' }}>
   <div style={{ padding: '15px 25px', background: '#2f3640', borderBottom: '1px solid #dcdde1', fontWeight: '400', fontSize: '13px', color:'#f5f6fa', letterSpacing: '2px' }}>CONVERSA DO PROCESSO</div>
   <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {mensagens.map((m) => (
     <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#f5f6fa' : '#ffffff', color: '#2f3640', padding: '14px 18px', borderRadius: '18px', maxWidth:'85%', border: '1px solid #dcdde1' }}>
      <span style={{ fontSize: '11px', opacity: 0.7, display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontWeight: '400', color: '#718093' }}>{m.usuario_nome?.toUpperCase()}</span>
      <span style={{ fontSize: '15px', lineHeight: '1.4', fontWeight: '400' }}>{m.texto}</span>
     </div>
    ))}
   </div>
   <form onSubmit={enviar} style={{ padding: '20px', background: '#ffffff', display: 'flex', gap: '12px', borderTop: '1px solid #dcdde1' }}>
     <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #dcdde1', background: '#ffffff', color: '#2f3640', outline: 'none', fontSize: '15px', fontWeight: '400' }} />
     <button style={{ background: '#2f3640', color: '#ffffff', border: 'none', borderRadius: '12px', width: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
   </form>
  </div>
 )
}

export default function HomeFinanceiro() {
 const [userProfile, setUserProfile] = useState(null); const [loading, setLoading] = useState(true); const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [showNovoMenu, setShowNovoMenu] = useState(false);
 const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
 const [listaBoletos, setListaBoletos] = useState([]); const [listaPagar, setListaPagar] = useState([]); const [listaReceber, setListaReceber] = useState([]); const [listaRH, setListaRH] = useState([]);
 const [fileBoleto, setFileBoleto] = useState(null);
 const router = useRouter();

 const carregarDados = async () => {
  const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').neq('status', 'pago').order('id', {ascending: false});
  
  let tarefasFaturamento = [];
  (bolds || []).forEach(c => {
    const statusPendentes = ['gerar_boleto', 'validar_pix'];
    if (c.qtd_parcelas > 1) {
        for (let i = 1; i <= c.qtd_parcelas; i++) {
            const stParc = c[`status_p${i}`] || 'gerar_boleto';
            if (statusPendentes.includes(stParc)) {
                const valorBanco = c[`valor_parcela${i}`];
                const valorCalculado = (valorBanco && valorBanco > 0) ? valorBanco : (c.valor_servico / c.qtd_parcelas).toFixed(2);
                tarefasFaturamento.push({ 
                    ...c, id_virtual: `${c.id}_p${i}`, nom_cliente: `${c.nom_cliente} (P${i})`, 
                    valor_exibicao: valorCalculado, status: stParc, num_parcela: i, gTipo: 'boleto',
                    vencimento_boleto: c.datas_parcelas?.split(/[\s,]+/)[i-1] || c.vencimento_boleto,
                    anexo_boleto: c[`anexo_boleto_p${i}`],
                    comprovante_pagamento: c[`comprovante_pagamento_p${i}`]
                });
            }
        }
    } else {
        if (statusPendentes.includes(c.status)) {
            tarefasFaturamento.push({ ...c, valor_exibicao: c.valor_servico, num_parcela: null, gTipo: 'boleto' });
        }
    }
  });

  setListaBoletos(tarefasFaturamento);
  const { data: pag } = await supabase.from('finan_pagar').select('*').eq('status', 'financeiro');
  const { data: rec } = await supabase.from('finan_receber').select('*').eq('status', 'financeiro');
  const { data: rhData } = await supabase.from('finan_rh').select('*').neq('status', 'concluido');
  setListaPagar((pag || []).map(p => ({...p, gTipo: 'pagar'}))); 
  setListaReceber((rec || []).map(r => ({...r, gTipo: 'receber'}))); 
  setListaRH((rhData || []).map(rh => ({...rh, gTipo: 'rh'})));
 }

 // REALTIME CONFIG
 useEffect(() => {
    const channel = supabase
      .channel('home_financeiro_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_pagar' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_receber' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_rh' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(channel) };
 }, []);

 useEffect(() => {
  const carregar = async () => {
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) return router.push('/login');
   const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
   setUserProfile(prof); setLoading(false); carregarDados();
  }; carregar();
 }, [router]);

 const handleUpdateField = async (t, field, value) => {
    const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
    const finalField = (t.gTipo === 'boleto' && t.id_virtual) && !['num_nf_servico', 'num_nf_peca', 'obs'].includes(field) ? `${field}_p${t.num_parcela}` : field;
    await supabase.from(table).update({ [finalField]: value }).eq('id', t.id);
    carregarDados();
 };

 const handleUpdateFileDirect = async (t, field, file) => {
    if(!file) return;
    try {
      const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
      const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      
      let col = field;
      if (t.gTipo === 'boleto' && t.id_virtual && ['anexo_boleto', 'comprovante_pagamento'].includes(field)) {
          col = `${field}_p${t.num_parcela}`;
      } else if (t.gTipo === 'boleto' && t.id_virtual && !['num_nf_servico', 'num_nf_peca', 'obs'].includes(field)) {
          col = `${field}_p${t.num_parcela}`;
      }
      
      await supabase.from(table).update({ [col]: linkData.publicUrl }).eq('id', t.id);
      alert("Arquivo atualizado!");
      carregarDados();
      if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: linkData.publicUrl }));
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleGerarBoletoFinanceiro = async (t) => {
  if (!fileBoleto) return alert("Anexe o boleto.");
  try {
    const path = `boletos/${Date.now()}-${fileBoleto.name}`;
    await supabase.storage.from('anexos').upload(path, fileBoleto);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    const isParcela = !!t.id_virtual;
    
    let updateData = isParcela ? 
        { [`status_p${t.num_parcela}`]: 'enviar_cliente', [`tarefa_p${t.num_parcela}`]: 'Enviar Boleto para o Cliente', [`anexo_boleto_p${t.num_parcela}`]: data.publicUrl } : 
        { status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl };
    
    await supabase.from('Chamado_NF').update(updateData).eq('id', t.id);
    alert("Tarefa enviada!"); setTarefaSelecionada(null);
  } catch (err) { alert("Erro: " + err.message); }
 };

 const handleMoverParaPago = async (t) => {
    try {
        const isParcela = !!t.id_virtual;
        let updateData = isParcela ? { [`status_p${t.num_parcela}`]: 'pago', [`tarefa_p${t.num_parcela}`]: 'Pagamento Confirmado' } : { status: 'pago', tarefa: 'Pagamento Confirmado' };
        await supabase.from('Chamado_NF').update(updateData).eq('id', t.id);
        alert("Pagamento confirmado!"); setTarefaSelecionada(null);
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleConcluirGeral = async (t) => {
    const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
    await supabase.from(table).update({ status: 'concluido' }).eq('id', t.id);
    alert("Processo concluído!"); setTarefaSelecionada(null);
 };

 if (loading) return <LoadingScreen />

 return (
  <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: '#f5f6fa' }}>
   <GeometricBackground />
   <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/home-financeiro" router={router} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} userProfile={userProfile} />

   <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '60px', transition: '0.4s ease' }}>
    <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'60px' }}>
      <div><h1 style={{ fontWeight: '300', color: '#2f3640', margin: 0, fontSize:'64px', letterSpacing:'-3px' }}>Painel Financeiro</h1><div style={{ width: '120px', height: '2px', background: '#2f3640', marginTop: '15px' }}></div></div>
      <div style={{ position: 'relative' }}>
       <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#2f3640', color:'#ffffff', border:'none', padding:'16px 32px', borderRadius:'0px', fontWeight:'400', cursor:'pointer', fontSize:'14px', boxShadow: '0 4px 10px rgba(47, 54, 64, 0.2)', letterSpacing: '2px', textTransform: 'uppercase' }}>NOVO CHAMADO</button>
       {showNovoMenu && (
        <div onMouseLeave={() => setShowNovoMenu(false)} style={dropItemStyle_Container}>
         <div onClick={() => router.push('/novo-chamado-nf')} style={dropItemStyle}>Chamado de Boleto</div>
         <div onClick={() => router.push('/novo-pagar-receber')} style={dropItemStyle}>Chamado Pagar/Receber</div>
         <div onClick={() => router.push('/novo-chamado-rh')} style={{ ...dropItemStyle, borderBottom:'none', color:'#718093' }}>Chamado de RH</div>
        </div>
       )}
      </div>
    </header>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px' }}>
     {/* COLUNA FATURAMENTO */}
     <div style={colWrapperStyle}>
      <div style={colTitleStyle}>Faturamento</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {listaBoletos.map(t => (
         <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{ background: '#ffffff', padding: '24px', color: '#2f3640', borderBottom: '1px solid #dcdde1' }}><h4 style={{ margin: 0, fontSize: '22px', fontWeight:'300', letterSpacing: '0px' }}>{t.nom_cliente?.toUpperCase()}</h4></div>
          <div style={{ padding: '24px', background: '#ffffff' }}>
           <div style={miniTagStyle}><CreditCard size={14}/> {t.forma_pagamento?.toUpperCase()}</div>
           <div style={{fontSize:'32px', color:'#2f3640', margin: '15px 0 5px 0', fontWeight: '300'}}>R$ {t.valor_exibicao}</div>
           <div style={{fontSize:'12px', color: '#718093', textTransform:'uppercase', letterSpacing:'2px', fontWeight: '400'}}>{t.status === 'validar_pix' ? 'VALIDAÇÃO PIX' : `Venc: ${formatarData(t.vencimento_boleto)}`}</div>
          </div>
         </div>
        ))}
      </div>
     </div>

     {/* COLUNA CONTAS */}
     <div style={colWrapperStyle}>
      <div style={colTitleStyle}>Contas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {listaPagar.map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{padding:'24px', background: '#ffffff', border: '1px solid #dcdde1', borderLeft: '4px solid #718093', borderRadius: '0px'}}><h4 style={{fontSize:'11px', color:'#718093', fontWeight:'400', letterSpacing: '2px'}}>A PAGAR</h4><div style={{fontSize:'22px', color:'#2f3640', marginTop:'5px', fontWeight: '300'}}>{t.fornecedor?.toUpperCase()}</div><div style={{fontSize:'26px', color:'#2f3640', marginTop:'10px', fontWeight: '300'}}>R$ {t.valor}</div></div>
         </div>
        ))}
        {listaReceber.map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{padding:'24px', background: '#ffffff', border: '1px solid #dcdde1', borderLeft: '4px solid #2f3640', borderRadius: '0px'}}><h4 style={{fontSize:'11px', color:'#2f3640', fontWeight:'400', letterSpacing: '2px'}}>A RECEBER</h4><div style={{fontSize:'22px', color:'#2f3640', marginTop:'5px', fontWeight: '300'}}>{t.cliente?.toUpperCase()}</div><div style={{fontSize:'26px', color:'#2f3640', marginTop:'10px', fontWeight: '300'}}>R$ {t.valor}</div></div>
         </div>
        ))}
      </div>
     </div>

     {/* COLUNA RH */}
     <div style={colWrapperStyle}>
      <div style={colTitleStyle}>RH</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {listaRH.map(t => (
         <div key={t.id} onClick={() => setTarefaSelecionada(t)} className="task-card">
          <div style={{padding:'24px', background: '#ffffff', border: '1px solid #dcdde1', borderLeft: '4px solid #718093', borderRadius: '0px'}}>
            <h4 style={{fontSize:'22px', color:'#2f3640', fontWeight:'300'}}>{t.funcionario?.toUpperCase()}</h4>
            <div style={{fontSize:'12px', color:'#718093', marginTop:'10px', textTransform:'uppercase', letterSpacing:'2px', fontWeight: '400'}}>{t.setor}</div>
            <div style={{fontSize:'14px', color:'#718093', marginTop:'5px', fontWeight: '300'}}>{t.titulo}</div>
          </div>
         </div>
        ))}
      </div>
     </div>
    </div>
   </main>

   {tarefaSelecionada && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(47, 54, 64, 0.4)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
     <div style={{ background: '#ffffff', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '0px', display: 'flex', overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.1)', border: '1px solid #dcdde1' }}>
     
      <div style={{ flex: '1.2', padding: '80px', overflowY: 'auto', color: '#2f3640' }}>
        <button onClick={() => setTarefaSelecionada(null)} className="btn-back-light"><ArrowLeft size={16}/> VOLTAR AO PAINEL</button>
        <h2 style={{fontSize:'84px', color:'#2f3640', fontWeight:'300', lineHeight:'1.0', margin:'40px 0 50px', letterSpacing: '-5px'}}>{tarefaSelecionada.nom_cliente || tarefaSelecionada.fornecedor || tarefaSelecionada.funcionario || tarefaSelecionada.cliente}</h2>
        
        <div style={{display:'flex', gap:'30px', marginBottom:'45px'}}>
          <div style={fieldBoxModal}><label style={labelModalStyle}>TIPO PROCESSO</label><p style={pModalStyle}>{tarefaSelecionada.gTipo?.toUpperCase()}</p></div>
          {tarefaSelecionada.gTipo !== 'rh' && (
            <>
              <div style={fieldBoxModal}><label style={labelModalStyle}>VALOR TOTAL</label><p style={{...pModalStyle, fontSize:'40px', fontWeight: '300', color: '#2f3640'}}>R$ {tarefaSelecionada.valor_exibicao || tarefaSelecionada.valor}</p></div>
              <div style={fieldBoxModal}><label style={labelModalStyle}>VENCIMENTO</label><p style={{...pModalStyle, color:'#718093', fontWeight: '300'}}>{formatarData(tarefaSelecionada.vencimento_boleto || tarefaSelecionada.data_vencimento)}</p></div>
            </>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'30px', border:'1px solid #dcdde1', padding:'45px', borderRadius:'0px', background:'#ffffff' }}>
          {tarefaSelecionada.gTipo === 'rh' ? (
            <>
              <div style={fieldBoxInner}><label style={labelModalStyle}>FUNCIONÁRIO</label><p style={{fontSize:'18px', fontWeight: '300'}}>{tarefaSelecionada.funcionario?.toUpperCase()}</p></div>
              <div style={fieldBoxInner}><label style={labelModalStyle}>SETOR</label><p style={{fontSize:'18px', color:'#718093', fontWeight: '300'}}>{tarefaSelecionada.setor?.toUpperCase()}</p></div>
              <div style={{...fieldBoxInner, gridColumn:'span 2'}}><label style={labelModalStyle}>TÍTULO DO CHAMADO</label><p style={{fontSize:'18px', fontWeight: '300'}}>{tarefaSelecionada.titulo}</p></div>
              <div style={{...fieldBoxInner, gridColumn:'span 2'}}><label style={labelModalStyle}>DESCRIÇÃO COMPLETA</label><p style={{fontSize:'18px', lineHeight:'1.6', color:'#2f3640', fontWeight: '300'}}>{tarefaSelecionada.descricao}</p></div>
            </>
          ) : (
            <>
              <div style={fieldBoxInner}><label style={labelModalStyle}>ID REGISTRO</label><p style={{fontSize:'18px', color: '#2f3640', fontWeight: '300'}}>#{tarefaSelecionada.id}</p></div>
              <div style={fieldBoxInner}><label style={labelModalStyle}>MÉTODO / CONDIÇÃO</label><p style={{fontSize:'18px', color: '#2f3640', fontWeight: '300'}}>{tarefaSelecionada.forma_pagamento || tarefaSelecionada.motivo || 'N/A'}</p></div>
              {tarefaSelecionada.gTipo === 'boleto' && (
                <>
                    <div style={fieldBoxInner}><label style={labelModalStyle}>NF SERVIÇO</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_servico', e.target.value)} /></div>
                    <div style={fieldBoxInner}><label style={labelModalStyle}>NF PEÇA</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_peca', e.target.value)} /></div>
                </>
              )}
              <div style={{gridColumn:'span 2', ...fieldBoxInner}}><label style={labelModalStyle}>OBSERVAÇÕES DO PROCESSO</label><textarea style={{...inputStyleLight, height:'120px', resize: 'none'}} defaultValue={tarefaSelecionada.obs || tarefaSelecionada.motivo} onBlur={e => handleUpdateField(tarefaSelecionada, tarefaSelecionada.gTipo === 'boleto' ? 'obs' : 'motivo', e.target.value)} /></div>
            </>
          )}
        </div>

        <div style={{marginTop:'40px'}}>
            <label style={labelModalStyle}>ANEXOS E DOCUMENTOS</label>
            <div style={{display:'flex', gap:'15px', flexWrap:'wrap', marginTop:'15px'}}>
                <AttachmentTag label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_servico', file)} />
                <AttachmentTag label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_peca', file)} />
                <AttachmentTag label="BOLETO" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'anexo_boleto', file)} />
                
                {tarefaSelecionada.status !== 'gerar_boleto' && (
                    <AttachmentTag label="COMPROVANTE" fileUrl={tarefaSelecionada.comprovante_pagamento || tarefaSelecionada.anexo_pix} onUpload={(file) => handleUpdateFileDirect(tarefaSelecionada, 'comprovante_pagamento', file)} />
                )}
            </div>
        </div>

        <div style={{marginTop:'50px', display:'flex', gap:'20px'}}>
            {tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{flex: 1, background:'#f5f6fa', padding:'40px', borderRadius:'0px', border:'1px solid #dcdde1'}}>
                    <label style={{...labelModalStyle, color:'#2f3640', fontSize: '13px', fontWeight: '400'}}>ANEXAR NOVO BOLETO</label>
                    <div style={{display:'flex', gap:'25px', marginTop:'20px', alignItems: 'center'}}>
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                            <button style={{ 
                                background: '#ffffff', color: '#2f3640', border: '1px dashed #dcdde1', 
                                padding: '18px 25px', borderRadius: '0px', width: '100%', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s',
                                fontSize: '15px', fontWeight: '300'
                            }}>
                                <Upload size={24} color="#2f3640" />
                                <span style={{ color: '#718093' }}>
                                    {fileBoleto ? fileBoleto.name : "Clique para selecionar o arquivo"}
                                </span>
                            </button>
                            <input type="file" onChange={e => setFileBoleto(e.target.files[0])} style={{ position: 'absolute', fontSize: '100px', opacity: 0, right: 0, top: 0, cursor: 'pointer' }} />
                        </div>

                        <div className="tooltip-container">
                            <button onClick={() => handleGerarBoletoFinanceiro(tarefaSelecionada)} style={btnPrimaryStyle}>LANÇAR TAREFA</button>
                            <div className="tooltip-box">Anexar Boleto e Gerar tarefa para o Pós Vendas enviar para o cliente</div>
                        </div>
                    </div>
                </div>
            )}

            {tarefaSelecionada.status === 'validar_pix' && (
                <button onClick={() => handleMoverParaPago(tarefaSelecionada)} style={{flex: 1, background:'#2f3640', color:'#fff', border:'none', padding:'25px', borderRadius:'0px', cursor:'pointer', fontSize: '16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', fontWeight:'400', letterSpacing: '2px', textTransform: 'uppercase'}}>
                    <DollarSign size={24}/> CONFIRMAR PIX E MOVER PARA PAGO
                </button>
            )}
            
            {tarefaSelecionada.gTipo !== 'boleto' && (
                <button onClick={() => handleConcluirGeral(tarefaSelecionada)} style={{flex: 1, background:'#2f3640', color:'#fff', border:'none', padding:'25px', borderRadius:'0px', cursor:'pointer', fontSize: '16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', fontWeight:'400', letterSpacing: '2px', textTransform: 'uppercase'}}>
                    <CheckCheck size={24}/> CONCLUIR PROCESSO
                </button>
            )}
        </div>
      </div>

      <div style={{ flex: '0.8', padding: '40px', background: '#ffffff', borderLeft:'1px solid #dcdde1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ width: '95%', height: '92%' }}>
        {userProfile && <ChatChamado registroId={tarefaSelecionada.id} tipo={tarefaSelecionada.gTipo} userProfile={userProfile} />}
       </div>
      </div>
     </div>
    </div>
   )}

   <style jsx global>{`
    * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; }
    .task-card { background: #ffffff; border: 1px solid #dcdde1; border-radius: 0px; cursor: pointer; transition: 0.4s ease; overflow: hidden; }
    .task-card:hover { transform: scale(1.02); box-shadow: 0 15px 40px rgba(47, 54, 64, 0.08); border-color: #2f3640; }
    .btn-back-light { background: #ffffff; color: #2f3640; border: 1px solid #dcdde1; padding: 10px 24px; border-radius: 0px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; font-size:12px; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; }
    button:active { transform: scale(0.98); }

    .tooltip-container { position: relative; display: flex; }
    .tooltip-box { 
        position: absolute; bottom: 115%; left: 50%; transform: translateX(-50%);
        background: #2f3640; color: #ffffff; padding: 15px 20px; border-radius: 0px;
        font-size: 13px; width: 300px; text-align: center; pointer-events: none;
        opacity: 0; transition: 0.3s; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        line-height: 1.4;
    }
    .tooltip-container:hover .tooltip-box { opacity: 1; bottom: 125%; }
   `}</style>
  </div>
 )
}

// --- COMPONENTE INTERNO DE TAG DE ANEXO ---
function AttachmentTag({ label, fileUrl, onUpload, disabled }) {
    const fileInputRef = useRef(null);
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #dcdde1', borderRadius: '0px', overflow: 'hidden', minWidth:'240px' }}>
            <span style={{ padding: '12px 18px', fontSize: '12px', color: '#2f3640', borderRight: '1px solid #dcdde1', flex: 1, fontWeight: '400', letterSpacing: '1px' }}>{label}</span>
            <div style={{ display: 'flex', background: '#f5f6fa' }}>
                {fileUrl && (
                    <button title="Ver arquivo" onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn}><Eye size={18} color="#2f3640" /></button>
                )}
                {!disabled && (
                    <>
                        <button title="Substituir/Anexar" onClick={() => fileInputRef.current.click()} style={miniActionBtn}><RefreshCw size={18} color="#718093" /></button>
                        <input type="file" ref={fileInputRef} hidden onChange={(e) => onUpload(e.target.files[0])} />
                    </>
                )}
            </div>
        </div>
    );
}

const dropItemStyle_Container = { position:'absolute', top:'65px', right: 0, background:'#ffffff', borderRadius:'0px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', zIndex:2000, width:'280px', border:'1px solid #2f3640', overflow:'hidden' };
const dropItemStyle = { padding:'15px 25px', cursor:'pointer', color:'#2f3640', background: '#ffffff', borderBottom:'1px solid #f5f6fa', fontSize:'13px', fontWeight: '400', textTransform: 'uppercase', letterSpacing: '1px' };
const colWrapperStyle = { padding: '30px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '0px', border: '1px solid #dcdde1' };
const colTitleStyle = { textAlign: 'center', fontSize: '30px', color:'#2f3640', fontWeight:'300', marginBottom:'45px', textTransform:'uppercase', letterSpacing:'5px' };
const miniTagStyle = { background: '#f5f6fa', padding: '6px 14px', borderRadius: '0px', color: '#2f3640', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #dcdde1', fontWeight: '400', letterSpacing: '1px' };
const labelModalStyle = { fontSize:'11px', color:'#718093', letterSpacing:'2px', textTransform:'uppercase', display:'block', marginBottom:'10px', fontWeight: '400' };
const pModalStyle = { fontSize:'24px', color:'#2f3640', margin:'0', fontWeight: '300' };
const fieldBoxModal = { border: '1px solid #dcdde1', padding: '25px', borderRadius: '0px', background: '#ffffff', flex: 1 };
const fieldBoxInner = { padding: '10px', borderRadius: '0px', background: 'transparent' };
const inputStyleLight = { width: '100%', padding: '18px', border: '1px solid #dcdde1', borderRadius: '0px', outline: 'none', background:'#ffffff', color:'#2f3640', fontSize: '15px', boxSizing: 'border-box', fontWeight: '300' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '12px 18px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const btnPrimaryStyle = { background:'#2f3640', color:'#ffffff', border:'none', padding:'20px 45px', borderRadius:'0px', cursor:'pointer', fontSize: '14px', fontWeight: '400', transition: '0.3s', textTransform: 'uppercase', letterSpacing: '2px' };