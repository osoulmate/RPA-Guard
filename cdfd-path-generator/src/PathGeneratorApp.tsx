import React, { useState } from 'react';

// 定义接口类型
interface TestCase {
  tc_id: string;
  scenario: string;
  path_str: string;
  final_state: string;
}

export default function PathGeneratorApp() {
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [results, setResults] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);

  // 优化：分离节点声明与连线，并完全复刻原版 CDFD 的两个控制输入
  const loadExample = () => {
    setMermaidCode(`%% 1. 声明所有节点及显示名称 (独立声明，完美兼容后端正则)
in_balance["输入虚线控制: balance"]
in_wdraw["输入虚线控制: w_draw"]
P1["Receive_Command (接收命令)"]
P2["Check_Password (校验鉴权)"]
P3["Withdraw (取款处理)"]
P4["Show_Balance (查询余额)"]
pr_msg_out["输出: pr_msg (密码错误)"]
e_msg_out["输出: e_msg (取款异常)"]
cash_out["输出: cash (成功吐钞)"]
balance_out["输出: balance (显示余额)"]

%% 2. 定义图的连线流转 (严格复刻原始 CDFD 架构)
in_balance --> P1
in_wdraw --> P1
P1 -- "sel" --> P2
P2 -- "pr_msg" --> pr_msg_out
P2 -- "account1" --> P3
P2 -- "account2" --> P4
P3 -- "e_msg" --> e_msg_out
P3 -- "cash" --> cash_out
P4 -- "balance" --> balance_out`);
  };

  const handleGenerate = async () => {
    if (!mermaidCode.trim()) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#fff', background: '#1e1e20', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center' }}>CDFD 路径自动生成器</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <textarea 
          value={mermaidCode}
          onChange={(e) => setMermaidCode(e.target.value)}
          placeholder="在此粘贴 Mermaid 代码..."
          rows={16}
          style={{ width: '80%', padding: '15px', fontFamily: 'monospace', background: '#2d2d2d', color: '#fff', border: '1px solid #444', borderRadius: '8px' }}
        />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button 
          onClick={loadExample} 
          style={{ marginRight: '15px', padding: '10px 20px', cursor: 'pointer', background: '#555', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          加载完美复刻版示例
        </button>
        <button 
          onClick={handleGenerate} 
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {loading ? '计算生成中...' : '生成测试路径'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ width: '90%', margin: '0 auto' }}>
          <table cellPadding={12} style={{ borderCollapse: 'collapse', width: '100%', background: '#2d2d2d', border: '1px solid #444' }}>
            <thead style={{ background: '#3d3d3d' }}>
              <tr>
                <th style={{ border: '1px solid #555' }}>用例编号</th>
                <th style={{ border: '1px solid #555' }}>测试场景</th>
                <th style={{ border: '1px solid #555' }}>执行路径 (节点+条件)</th>
                <th style={{ border: '1px solid #555' }}>最终状态</th>
              </tr>
            </thead>
            <tbody>
              {results.map((tc) => (
                <tr key={tc.tc_id} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ border: '1px solid #555', textAlign: 'center' }}>{tc.tc_id}</td>
                  <td style={{ border: '1px solid #555' }}>{tc.scenario}</td>
                  <td style={{ border: '1px solid #555', lineHeight: '1.6' }}>{tc.path_str}</td>
                  <td style={{ border: '1px solid #555', textAlign: 'center' }}>{tc.final_state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}