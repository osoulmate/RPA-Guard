import mermaid from 'mermaid';
import React, { useEffect, useRef, useState } from 'react';

// --- 接口定义 ---
interface TestCase {
  tc_id: string;
  scenario: string;
  path_str: string;
  final_state: string;
}

// --- 专门用于渲染 Mermaid 图像的子组件 ---
const MermaidViewer = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    if (code && containerRef.current) {
      mermaid.render('mermaid-preview-svg', code)
        .then((result) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = result.svg;
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.maxHeight = '100%';
            }
          }
        })
        .catch((error) => {
          console.error("Mermaid 渲染失败:", error);
          if (containerRef.current) {
            containerRef.current.innerHTML = '<div style="color: #ff6b6b; padding: 20px;">图表语法有误，请检查 Mermaid 代码是否闭合或包含非法字符。</div>';
          }
        });
    } else if (!code && containerRef.current) {
      containerRef.current.innerHTML = '<div style="color: #888; padding: 20px;">暂无图表数据</div>';
    }
  }, [code, isFullscreen]);

  const viewerStyle: React.CSSProperties = isFullscreen ? {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 9999, background: '#1e1e20', display: 'flex', justifyContent: 'center',
    alignItems: 'center', padding: '40px', boxSizing: 'border-box'
  } : {
    width: '100%', height: '100%', display: 'flex', justifyContent: 'center',
    alignItems: 'center', overflow: 'auto', background: '#2d2d2d',
    borderRadius: '8px', border: '1px solid #444', position: 'relative'
  };

  return (
    <div style={viewerStyle}>
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        style={{
          position: 'absolute', top: isFullscreen ? '20px' : '10px', right: isFullscreen ? '20px' : '10px',
          padding: '6px 12px', background: isFullscreen ? '#ff5252' : '#555', color: '#fff',
          border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 10000,
          fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        {isFullscreen ? '✖ 退出全屏' : '⛶ 全屏预览'}
      </button>
      <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
    </div>
  );
};

// --- 内置的三个不同场景模型 ---
const EXAMPLES = {
  atm: `%% 1. 独立声明所有节点 (全矩形安全声明)
D1["account_file (账户数据库)"]
in_balance["控制输入: balance"]
in_wdraw["控制输入: w_draw"]
in_card["数据输入: card_id"]
in_pass["数据输入: pass"]
P1["Receive_Command"]
P2["Check_Password"]
P3["Withdraw"]
P4["Show_Balance"]
pr_msg_out["输出: pr_msg (错误)"]
e_msg_out["输出: e_msg (异常)"]
cash_out["输出: cash (吐钞)"]
balance_out["输出: balance"]
in_amount["数据输入: amount"]
%% 2. 外部输入连线
in_balance --> P1
in_wdraw --> P1
in_card --> P2
in_pass --> P2

%% 3. 核心业务流转
P1 -- "sel" --> P2
D1 --> P2
in_amount --> P3
%% 4. 分支流转与系统输出
P2 -- "pr_msg" --> pr_msg_out
P2 -- "account1" ---> P3
P2 -- "account2" --> P4
P3 -- "e_msg" --> e_msg_out
P3 -- "cash" --> cash_out
P4 -- "blance"--> balance_out
%% 5. 状态写入 (形成数据闭环)
P3  --> D1`,

  ecommerce: `%% 1. 数据存储
DB1["Inventory_DB (库存数据库)"]
DB2["Order_DB (订单数据库)"]

%% 2. 外部输入
in_item["数据输入: item_id"]
in_qty["数据输入: quantity"]
in_pay["控制输入: pay_req"]

%% 3. 业务流转节点
P1["Check_Inventory (检查库存)"]
P2["Process_Payment (处理支付)"]
P3["Create_Order (创建订单)"]

%% 4. 输出节点
out_no_stock["输出: Out_of_Stock (缺货)"]
out_pay_fail["输出: Payment_Failed (支付失败)"]
out_success["输出: Order_Success (下单成功)"]

%% 5. 连线与分支
in_item --> P1
in_qty --> P1
DB1 --> P1
P1 -- "库存不足" --> out_no_stock
P1 -- "库存充足" --> P2
in_pay ---> P2
P2 -- "支付失败" --> out_pay_fail
P2 -- "支付成功" --> P3

%% 6. 数据写入
P3 ---> DB1
P3 ---> DB2
P3 -- "回执" --> out_success`,

  iot: `%% 1. 数据存储
DB_Log["Log_DB (安防日志)"]

%% 2. 外部输入
in_sensor["数据输入: motion_data"]
in_mode["控制输入: arm_mode (布防模式)"]

%% 3. 业务节点
P1["Analyze_Motion (动作分析)"]
P2["Check_Rule (规则匹配)"]
P3["Trigger_Alarm (触发报警)"]

%% 4. 输出节点
out_ignore["输出: Ignore (忽略)"]
out_siren["输出: Siren_Sound (警报长鸣)"]
out_notify["输出: Push_Notify (App推送)"]

%% 5. 连线与流转
in_sensor --> P1
P1 -- "无威胁" --> out_ignore
P1 -- "发现异常" --> P2
in_mode ---> P2
P2 -- "未布防" --> out_ignore
P2 -- "已布防" --> P3

%% 6. 数据写入与输出
P3 -- "日志写入" ---> DB_Log
P3 -- "高危级别" --> out_siren
P3 -- "普通级别" --> out_notify`
};


// --- 主应用组件 ---
export default function PathGeneratorApp() {
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [renderCode, setRenderCode] = useState<string>('');
  const [results, setResults] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExample, setSelectedExample] = useState<keyof typeof EXAMPLES>('atm');

  const loadExample = () => {
    const code = EXAMPLES[selectedExample];
    setMermaidCode(code);
    setRenderCode(`graph LR\n${code}`);
  };

  const handleGenerate = async () => {
    if (!mermaidCode.trim()) return;
    setLoading(true);
    setRenderCode(`graph LR\n${mermaidCode}`);

    try {
      const response = await fetch('http://localhost:8000/api/generate_paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermaid_code: mermaidCode }),
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        setResults(resData.data);
      }
    } catch (error) {
      console.error("生成失败", error);
      alert("无法连接到后端服务，请检查 FastAPI 是否在 8000 端口启动！");
    } finally {
      setLoading(false);
    }
  };

  // --- 核心功能：一键导出 CSV ---
  const exportToCSV = () => {
    if (results.length === 0) return;

    // 1. 构建 CSV 内容 (添加 BOM \uFEFF 解决 Excel 打开中文乱码问题)
    const headers = ['用例编号', '测试场景', '完整执行路径 (节点 + 控制条件)', '系统终态'];
    const rows = results.map(tc => [
      tc.tc_id,
      `"${tc.scenario}"`, // 加引号防止内容中有逗号导致错行
      `"${tc.path_str}"`,
      `"${tc.final_state}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    // 2. 触发下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MBT_TestCases_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#fff', background: '#1e1e20', minHeight: '100vh' }}>

      {/* 顶部：左右分栏布局 */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', height: '450px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '10px', fontSize: '14px', color: '#aaa' }}>Mermaid 架构定义 (不需写 graph LR)</div>
          <textarea
            value={mermaidCode}
            onChange={(e) => setMermaidCode(e.target.value)}
            placeholder="在此粘贴图表定义代码..."
            style={{
              flex: 1, padding: '15px', fontFamily: 'monospace', fontSize: '14px',
              background: '#2d2d2d', color: '#fff', border: '1px solid #444', borderRadius: '8px', resize: 'none'
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '10px', fontSize: '14px', color: '#aaa' }}>架构图实时预览</div>
          <MermaidViewer code={renderCode} />
        </div>
      </div>

      {/* 中间：操作按钮组 (新增了下拉选择器) */}
      <div style={{ textAlign: 'center', marginBottom: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
        <select
          value={selectedExample}
          onChange={(e) => setSelectedExample(e.target.value as keyof typeof EXAMPLES)}
          style={{ padding: '9px 12px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', outline: 'none' }}
        >
          <option value="atm">示例 1: ATM 取款机系统 (CDFD)</option>
          <option value="ecommerce">示例 2: 电商订单交易系统</option>
          <option value="iot">示例 3: 智能安防物联网 (IoT)</option>
        </select>

        <button onClick={loadExample} style={{ padding: '10px 20px', cursor: 'pointer', background: '#555', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px' }}>
          加载选中示例
        </button>
        <button onClick={handleGenerate} disabled={loading} style={{ padding: '10px 24px', cursor: loading ? 'not-allowed' : 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '15px', fontWeight: 'bold' }}>
          {loading ? '计算生成中...' : '渲染图表并生成测试路径'}
        </button>
      </div>

      {/* 底部：测试用例表格与导出按钮 */}
      {results.length > 0 && (
        <div style={{ width: '100%', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', borderLeft: '4px solid #4CAF50', paddingLeft: '10px' }}>
              自动生成的全覆盖测试路径 (共 {results.length} 条)
            </div>
            {/* 新增的导出按钮 */}
            <button
              onClick={exportToCSV}
              style={{ padding: '6px 16px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ⬇ 导出为 CSV (Excel)
            </button>
          </div>

          <table cellPadding={12} style={{ borderCollapse: 'collapse', width: '100%', background: '#2d2d2d', border: '1px solid #444', fontSize: '14px' }}>
            <thead style={{ background: '#3d3d3d' }}>
              <tr>
                <th style={{ border: '1px solid #555', width: '10%' }}>用例编号</th>
                <th style={{ border: '1px solid #555', width: '20%' }}>测试场景</th>
                <th style={{ border: '1px solid #555', width: '55%' }}>完整执行路径 (节点 + 控制条件)</th>
                <th style={{ border: '1px solid #555', width: '15%' }}>系统终态</th>
              </tr>
            </thead>
            <tbody>
              {results.map((tc) => (
                <tr key={tc.tc_id} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ border: '1px solid #555', textAlign: 'center', fontWeight: 'bold', color: '#4CAF50' }}>{tc.tc_id}</td>
                  <td style={{ border: '1px solid #555' }}>{tc.scenario}</td>
                  <td style={{ border: '1px solid #555', lineHeight: '1.8', fontFamily: 'monospace' }}>{tc.path_str}</td>
                  <td style={{ border: '1px solid #555', textAlign: 'center', background: '#353535' }}>{tc.final_state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}