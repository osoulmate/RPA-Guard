# main.py
import re
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 允许跨域，方便本地 React 联调
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 接收前端传来的数据模型
class MermaidRequest(BaseModel):
    mermaid_code: str

class PathGenerator:
    def __init__(self):
        self.graph = {}
        self.node_names = {}

    def parse(self, mermaid_code: str):
        self.graph = {}
        self.node_names = {}
        
        # 匹配连线
        pattern_conditional = re.compile(r'([A-Za-z0-9_]+)\s*--\s*"([^"]+)"\s*-->\s*([A-Za-z0-9_]+)')
        pattern_unconditional = re.compile(r'([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)')
        # 【新增】自动匹配并提取 Mermaid 中的节点名称，如 P1["接收命令"]
        pattern_node_alias = re.compile(r'([A-Za-z0-9_]+)\["?([^"\]]+)"?\]')

        for line in mermaid_code.split('\n'):
            line = line.strip()
            if line.startswith('%%') or line.startswith('class ') or not line:
                continue
                
            # 提取节点别名存入字典
            alias_match = pattern_node_alias.search(line)
            if alias_match:
                node_id, alias = alias_match.groups()
                self.node_names[node_id] = alias

            # 提取图边关系
            match_cond = pattern_conditional.search(line)
            if match_cond:
                src, cond, tgt = match_cond.groups()
                self.graph.setdefault(src, []).append((cond, tgt))
                continue
                
            match_uncond = pattern_unconditional.search(line)
            if match_uncond:
                src, tgt = match_uncond.groups()
                self.graph.setdefault(src, []).append(("无条件流转", tgt))

    def get_roots(self):
        # 自动寻找图的起点（入度为0的节点）
        targets = {tgt for edges in self.graph.values() for _, tgt in edges}
        roots = set(self.graph.keys()) - targets
        return list(roots) if roots else list(self.graph.keys())[:1]

    def _dfs(self, current_node, current_path, all_paths):
        if current_node not in self.graph or not self.graph[current_node]:
            all_paths.append(current_path)
            return
        for condition, next_node in self.graph[current_node]:
            self._dfs(next_node, current_path + [(condition, next_node)], all_paths)

    def generate(self, mermaid_code: str) -> List[Dict]:
        self.parse(mermaid_code)
        if not self.graph:
            return []

        all_paths = []
        roots = self.get_roots()
        for root in roots:
            self._dfs(root, [("起点", root)], all_paths)

        # 格式化为前端需要的 JSON 数组结构
        results = []
        for index, path in enumerate(all_paths):
            steps_str = ""
            for i, (condition, target_node) in enumerate(path):
                target_name = self.node_names.get(target_node, target_node)
                if i == 0:
                    steps_str += f"[{target_name}]"
                else:
                    steps_str += f" --({condition})--> [{target_name}]"
            
            final_node = path[-1][1]
            final_node_name = self.node_names.get(final_node, final_node)
            
            results.append({
                "tc_id": f"TC_{str(index + 1).zfill(3)}",
                "scenario": f"测试流向 {final_node} 的分支",
                "path_str": steps_str,
                "final_state": final_node_name
            })
        return results

@app.post("/api/generate_paths")
def generate_paths(req: MermaidRequest):
    generator = PathGenerator()
    paths = generator.generate(req.mermaid_code)
    return {"status": "success", "total": len(paths), "data": paths}

# 运行命令: uvicorn main:app --reload