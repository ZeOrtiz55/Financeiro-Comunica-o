'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MenuLateral from '@/components/MenuLateral'
import { formatarMoeda, formatarDataBR } from '@/lib/utils'
import {
  BarChart2, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, DollarSign, FileText, Users, Calendar
} from 'lucide-react'

function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '24px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
        Dashboard <br />
        <span style={{ fontSize: '28px', fontWeight: '400' }}>Nova Tratores</span>
      </h1>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div style={{
      background: bg || '#fff',
      border: '0.5px solid #e2e8f0',
      borderRadius: '20px',
      padding: '28px 30px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      minWidth: 0,
      flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#9e9e9e', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ background: color + '18', borderRadius: '10px', padding: '8px', display: 'flex' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <span style={{ fontSize: '30px', color: '#1a1a1a', letterSpacing: '-1px' }}>{value}</span>
      {sub && <span style={{ fontSize: '12px', color: '#9e9e9e' }}>{sub}</span>}
    </div>
  )
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#616161', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#9e9e9e' }}>{count} ({pct}%)</span>
      </div>
      <div style={{ background: '#f5f5f5', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
        <div style={{ background: color, width: pct + '%', height: '100%', borderRadius: '6px', transition: '0.6s ease' }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [kpis, setKpis] = useState(null)
  const router = useRouter()
  const path = typeof window !== 'undefined' ? window.location.pathname : '/dashboard'

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)

      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
      const em7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const hojeStr = hoje.toISOString().split('T')[0]

      const [
        { data: boletos },
        { data: pagar },
        { data: rh },
      ] = await Promise.all([
        supabase.from('Chamado_NF').select('id, status, valor_servico, vencimento_boleto, fornecedor, forma_pagamento'),
        supabase.from('finan_pagar').select('id, status, valor, data_vencimento, fornecedor'),
        supabase.from('finan_rh').select('id, status, valor'),
      ])

      const boletosArr = boletos || []
      const pagarArr = pagar || []
      const rhArr = rh || []

      // --- KPIs Boletos ---
      const totalBoletos = boletosArr.length
      const boletosEmAberto = boletosArr.filter(b => !['concluido'].includes(b.status)).length
      const boletosAtrasados = boletosArr.filter(b => b.status === 'vencido').length
      const boletosConfirmados = boletosArr.filter(b => ['pago', 'concluido'].includes(b.status)).length
      const totalFaturado = boletosArr
        .filter(b => ['pago', 'concluido'].includes(b.status))
        .reduce((acc, b) => acc + (parseFloat(b.valor_servico) || 0), 0)

      // --- KPIs Pagar ---
      const pagarPendente = pagarArr.filter(p => p.status !== 'concluido').length
      const pagarEsteMes = pagarArr
        .filter(p => p.data_vencimento >= inicioMes && p.data_vencimento <= fimMes && p.status !== 'concluido')
        .reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0)
      const pagarAtrasado = pagarArr.filter(p => p.status !== 'concluido' && p.data_vencimento < hojeStr)
      const totalAtrasadoPagar = pagarAtrasado.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0)

      // --- KPIs RH ---
      const rhPendente = rhArr.filter(r => r.status !== 'concluido').length
      const totalRH = rhArr.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0)

      // --- Próximos vencimentos (pagar, próximos 7 dias, não concluído) ---
      const proximosVencimentos = pagarArr
        .filter(p => p.status !== 'concluido' && p.data_vencimento >= hojeStr && p.data_vencimento <= em7Dias)
        .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
        .slice(0, 8)

      // --- Top Fornecedores (por valor pago em finan_pagar concluído) ---
      const fornMap = {}
      pagarArr.filter(p => p.status === 'concluido').forEach(p => {
        const key = p.fornecedor || 'Sem fornecedor'
        if (!fornMap[key]) fornMap[key] = { nome: key, total: 0, qtd: 0 }
        fornMap[key].total += parseFloat(p.valor) || 0
        fornMap[key].qtd++
      })
      const topForn = Object.values(fornMap).sort((a, b) => b.total - a.total).slice(0, 5)

      // --- Funil de status boletos ---
      const statusCount = {}
      boletosArr.forEach(b => {
        statusCount[b.status] = (statusCount[b.status] || 0) + 1
      })

      setKpis({
        totalBoletos,
        boletosEmAberto,
        boletosAtrasados,
        boletosConfirmados,
        totalFaturado,
        pagarPendente,
        pagarEsteMes,
        totalAtrasadoPagar,
        pagarAtrasadoLista: pagarAtrasado,
        rhPendente,
        totalRH,
        proximosVencimentos,
        topForn,
        statusCount,
      })

      setLoading(false)
    }
    fetchData()
  }, [router])

  if (loading) return <LoadingScreen />

  const STATUS_LABELS = {
    gerar_boleto: 'Gerar Boleto',
    enviar_cliente: 'Enviar ao Cliente',
    aguardando_vencimento: 'Aguard. Vencimento',
    pago: 'Pago',
    vencido: 'Vencido',
    concluido: 'Concluído',
  }
  const STATUS_COLORS = {
    gerar_boleto: '#f59e0b',
    enviar_cliente: '#3b82f6',
    aguardando_vencimento: '#8b5cf6',
    pago: '#10b981',
    vencido: '#ef4444',
    concluido: '#6b7280',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Montserrat, sans-serif' }}>
      <MenuLateral
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        path={path}
        router={router}
        handleLogout={handleLogout}
        userProfile={userProfile}
      />

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', transition: '0.4s ease' }}>

        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontWeight: '400', color: '#333', margin: 0, fontSize: '32px', letterSpacing: '-1px' }}>DASHBOARD</h1>
          <div style={{ width: '60px', height: '4px', background: '#9e9e9e', marginTop: '12px', borderRadius: '2px' }} />
        </header>

        {/* KPI ROW 1 — Boletos */}
        <section style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#bbb', marginBottom: '16px' }}>BOLETOS / FATURAMENTO</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <KpiCard icon={FileText} label="Total de Processos" value={kpis.totalBoletos} sub="todos os status" color="#6366f1" />
            <KpiCard icon={Clock} label="Em Aberto" value={kpis.boletosEmAberto} sub="aguardando conclusão" color="#f59e0b" />
            <KpiCard icon={AlertTriangle} label="Em Atraso" value={kpis.boletosAtrasados} sub="status vencido" color="#ef4444" />
            <KpiCard icon={CheckCircle} label="Confirmados / Pagos" value={kpis.boletosConfirmados} sub="pago + concluído" color="#10b981" />
            <KpiCard icon={TrendingUp} label="Total Faturado" value={formatarMoeda(kpis.totalFaturado)} sub="processos pago/concluído" color="#0ea5e9" />
          </div>
        </section>

        {/* KPI ROW 2 — Pagar e RH */}
        <section style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#bbb', marginBottom: '16px' }}>CONTAS A PAGAR / RH</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <KpiCard icon={DollarSign} label="A Pagar Pendente" value={kpis.pagarPendente} sub="aguardando pagamento" color="#f59e0b" />
            <KpiCard icon={Calendar} label="Vence Este Mês" value={formatarMoeda(kpis.pagarEsteMes)} sub="não concluídos no mês" color="#8b5cf6" />
            <KpiCard icon={TrendingDown} label="Em Atraso (Pagar)" value={formatarMoeda(kpis.totalAtrasadoPagar)} sub={`${kpis.pagarAtrasadoLista.length} títulos vencidos`} color="#ef4444" />
            <KpiCard icon={Users} label="RH Pendente" value={kpis.rhPendente} sub="chamados ativos" color="#0ea5e9" />
          </div>
        </section>

        {/* LINHA INFERIOR: Funil + Vencimentos + Top Fornecedores */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* FUNIL DE STATUS */}
          <div style={{ background: '#fff', borderRadius: '20px', border: '0.5px solid #e2e8f0', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <p style={{ margin: '0 0 24px', fontSize: '11px', letterSpacing: '1.5px', color: '#9e9e9e' }}>FUNIL DE STATUS — BOLETOS</p>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <StatusBar
                key={key}
                label={label}
                count={kpis.statusCount[key] || 0}
                total={kpis.totalBoletos}
                color={STATUS_COLORS[key]}
              />
            ))}
          </div>

          {/* PRÓXIMOS VENCIMENTOS */}
          <div style={{ background: '#fff', borderRadius: '20px', border: '0.5px solid #e2e8f0', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <p style={{ margin: '0 0 24px', fontSize: '11px', letterSpacing: '1.5px', color: '#9e9e9e' }}>PRÓXIMOS VENCIMENTOS (7 DIAS)</p>
            {kpis.proximosVencimentos.length === 0 && (
              <p style={{ color: '#bbb', fontSize: '13px' }}>Nenhum vencimento nos próximos 7 dias.</p>
            )}
            {kpis.proximosVencimentos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', marginBottom: '14px', borderBottom: '0.5px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#424242' }}>{p.fornecedor?.toUpperCase() || 'SEM FORNECEDOR'}</div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>{formatarDataBR(p.data_vencimento)}</div>
                </div>
                <span style={{ fontSize: '13px', color: '#333' }}>{formatarMoeda(p.valor)}</span>
              </div>
            ))}
          </div>

          {/* TOP FORNECEDORES */}
          <div style={{ background: '#fff', borderRadius: '20px', border: '0.5px solid #e2e8f0', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <p style={{ margin: '0 0 24px', fontSize: '11px', letterSpacing: '1.5px', color: '#9e9e9e' }}>TOP FORNECEDORES (PAGO)</p>
            {kpis.topForn.length === 0 && (
              <p style={{ color: '#bbb', fontSize: '13px' }}>Nenhum pagamento concluído.</p>
            )}
            {kpis.topForn.map((f, i) => (
              <div key={f.nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', marginBottom: '14px', borderBottom: '0.5px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#bbb', width: '18px' }}>#{i + 1}</span>
                  <div>
                    <div style={{ fontSize: '13px', color: '#424242' }}>{f.nome.toUpperCase()}</div>
                    <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>{f.qtd} {f.qtd === 1 ? 'pagamento' : 'pagamentos'}</div>
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: '#333' }}>{formatarMoeda(f.total)}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      <style jsx global>{`
        * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; }
      `}</style>
    </div>
  )
}
