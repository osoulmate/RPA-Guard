import re
import csv
import io
def parse_mermaid_to_graph(mermaid_code):
    """
    解析 Mermaid 代码，生成图的邻接表 (字典)
    """
    graph = {}
    
    # 正则表达式 1: 匹配带有条件的连线，例如: P1 -- "sel" --> P2
    pattern_conditional = re.compile(r'([A-Za-z0-9_]+)\s*--\s*"([^"]+)"\s*-->\s*([A-Za-z0-9_]+)')
    
    # 正则表达式 2: 匹配无条件的连线，例如: cmd_in --> P1
    pattern_unconditional = re.compile(r'([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)')

    lines = mermaid_code.split('\n')
    for line in lines:
        line = line.strip()
        # 忽略注释和样式定义
        if line.startswith('%%') or line.startswith('class') or not line:
            continue
            
        # 尝试匹配带条件的连线
        match_cond = pattern_conditional.search(line)
        if match_cond:
            source, condition, target = match_cond.groups()
            if source not in graph:
                graph[source] = []
            graph[source].append((condition, target))
            continue
            
        # 尝试匹配无条件的连线
        match_uncond = pattern_unconditional.search(line)
        if match_uncond:
            source, target = match_uncond.groups()
            if source not in graph:
                graph[source] = []
            graph[source].append(("无条件流转", target))

    return graph
# --- 3. 升级版：带上方框功能的测试用例生成器 ---
def generate_detailed_test_cases(all_paths, names_dict):
    print("用例编号 | 测试场景描述 | 完整执行流转 (方框功能 + 连线条件) | 最终状态")
    print("---|---|---|---")
    
    for index, path in enumerate(all_paths):
        tc_id = f"TC_{str(index + 1).zfill(3)}"
        
        steps_str = ""
        for i, step in enumerate(path):
            condition, target_node = step
            target_name = names_dict.get(target_node, target_node) # 查字典获取真实的方框名字
            
            if i == 0:
                steps_str += f"**[{target_name}]**"
            else:
                # 将连线条件和下一个方框的名字结合起来
                steps_str += f" --({condition})--> **[{target_name}]**"
                
        final_node_name = names_dict.get(path[-1][1], path[-1][1])
        scenario = f"测试流向 {path[-1][1]} 的分支"
        
        print(f"{tc_id} | {scenario} | {steps_str} | {final_node_name}")

# --- 1. 增加：方框功能名称的映射字典 (Node Labels) ---
node_names = {
    "cmd_in": "外部输入",
    "P1": "Receive_Command (接收命令)",
    "P2": "Check_Password (校验密码)",
    "P3": "Withdraw (取款处理)",
    "P4": "Show_Balance (显示余额)",
    "pr_msg_out": "终端打印_密码错误",
    "e_msg_out": "终端打印_操作异常",
    "cash_out": "终端_吐钞",
    "balance_out": "终端_显示余额数值"
}

# --- 2. 之前的 Mermaid 数据流保持不变 ---
mermaid_input = """
    cmd_in --> P1
    P1 -- "sel" --> P2
    P2 -- "pr_msg" --> pr_msg_out
    P2 -- "account1" --> P3
    P2 -- "account2" --> P4
    P3 -- "e_msg" --> e_msg_out
    P3 -- "cash" --> cash_out
    P4 -- "balance" --> balance_out
"""

# --- 2. 运行解析器前端 ---
parsed_graph = parse_mermaid_to_graph(mermaid_input)

# --- 3. 运行 DFS 路径生成 (复用之前的逻辑) ---
all_generated_paths = []
def find_all_paths(graph, current_node, current_path, all_paths):
    # 如果当前节点没有下一步，说明是终点
    if current_node not in graph or not graph[current_node]:
        all_paths.append(current_path)
        return
    for condition, next_node in graph[current_node]:
        find_all_paths(graph, next_node, current_path + [(condition, next_node)], all_paths)

find_all_paths(parsed_graph, "cmd_in", [("起点", "cmd_in")], all_generated_paths)

# --- 4. 运行用例生成器并打印 CSV ---
csv_result = generate_detailed_test_cases(all_generated_paths, node_names)
print(csv_result)