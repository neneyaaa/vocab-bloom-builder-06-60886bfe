export interface Word {
  id: number;
  word: string;
  meaning: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

const wordBank: Word[] = [
  { id: 1, word: "abandon", meaning: "放弃；抛弃", options: ["放弃；抛弃", "吸收；吸引", "完成；达到", "积累；累积"], difficulty: "easy" },
  { id: 2, word: "benefit", meaning: "利益；好处", options: ["限制；约束", "利益；好处", "负担；重担", "障碍；阻碍"], difficulty: "easy" },
  { id: 3, word: "challenge", meaning: "挑战；质疑", options: ["机会；机遇", "变化；改变", "挑战；质疑", "平衡；均衡"], difficulty: "easy" },
  { id: 4, word: "demonstrate", meaning: "证明；展示", options: ["怀疑；质疑", "证明；展示", "破坏；损害", "隐藏；遮蔽"], difficulty: "easy" },
  { id: 5, word: "essential", meaning: "必要的；本质的", options: ["多余的；额外的", "偶然的；意外的", "必要的；本质的", "可选的；随意的"], difficulty: "easy" },
  { id: 6, word: "facilitate", meaning: "促进；使便利", options: ["阻碍；妨碍", "促进；使便利", "复杂化", "延迟；推迟"], difficulty: "medium" },
  { id: 7, word: "genuine", meaning: "真正的；真诚的", options: ["虚假的；伪造的", "普通的；一般的", "真正的；真诚的", "短暂的；临时的"], difficulty: "medium" },
  { id: 8, word: "hypothesis", meaning: "假说；假设", options: ["结论；结果", "假说；假设", "证据；证明", "定律；法则"], difficulty: "medium" },
  { id: 9, word: "inevitable", meaning: "不可避免的", options: ["可预防的", "不可避免的", "难以置信的", "可逆转的"], difficulty: "medium" },
  { id: 10, word: "jurisdiction", meaning: "司法权；管辖范围", options: ["司法权；管辖范围", "立法权；制定", "行政权；执行", "监督权；审查"], difficulty: "hard" },
  { id: 11, word: "keen", meaning: "热切的；敏锐的", options: ["冷淡的；漠不关心的", "热切的；敏锐的", "愚钝的；迟钝的", "犹豫的；不确定的"], difficulty: "easy" },
  { id: 12, word: "legitimate", meaning: "合法的；正当的", options: ["非法的；违规的", "模糊的；不确定的", "合法的；正当的", "临时的；暂时的"], difficulty: "medium" },
  { id: 13, word: "manuscript", meaning: "手稿；原稿", options: ["印刷品；出版物", "手稿；原稿", "草图；草案", "副本；复制品"], difficulty: "medium" },
  { id: 14, word: "notorious", meaning: "臭名昭著的", options: ["默默无闻的", "臭名昭著的", "广受赞誉的", "毫无争议的"], difficulty: "medium" },
  { id: 15, word: "obsolete", meaning: "过时的；废弃的", options: ["过时的；废弃的", "先进的；前沿的", "流行的；时尚的", "永恒的；持久的"], difficulty: "medium" },
  { id: 16, word: "paradigm", meaning: "范式；典范", options: ["异常；反常", "范式；典范", "矛盾；冲突", "偏差；偏离"], difficulty: "hard" },
  { id: 17, word: "resilient", meaning: "有弹性的；适应力强的", options: ["脆弱的；易碎的", "固执的；顽固的", "有弹性的；适应力强的", "被动的；消极的"], difficulty: "medium" },
  { id: 18, word: "scrutinize", meaning: "仔细审查；细查", options: ["忽略；忽视", "仔细审查；细查", "简要浏览", "随意处理"], difficulty: "hard" },
  { id: 19, word: "tangible", meaning: "有形的；切实的", options: ["抽象的；模糊的", "理论的；假设的", "有形的；切实的", "虚幻的；不真实的"], difficulty: "medium" },
  { id: 20, word: "ubiquitous", meaning: "无处不在的", options: ["稀缺的；罕见的", "无处不在的", "独特的；唯一的", "局部的；地区性的"], difficulty: "hard" },
  { id: 21, word: "verbose", meaning: "冗长的；啰嗦的", options: ["简洁的；精炼的", "冗长的；啰嗦的", "沉默的；安静的", "生动的；形象的"], difficulty: "hard" },
  { id: 22, word: "withdraw", meaning: "撤回；退出", options: ["加入；参与", "撤回；退出", "投入；奉献", "前进；推进"], difficulty: "easy" },
  { id: 23, word: "yield", meaning: "产出；屈服", options: ["抵抗；反抗", "消耗；浪费", "产出；屈服", "隐藏；掩盖"], difficulty: "easy" },
  { id: 24, word: "ambiguous", meaning: "模棱两可的", options: ["明确的；清晰的", "模棱两可的", "简单的；直接的", "精确的；准确的"], difficulty: "medium" },
  { id: 25, word: "comprehensive", meaning: "全面的；综合的", options: ["片面的；局部的", "全面的；综合的", "简略的；概括的", "深入的；详尽的"], difficulty: "medium" },
  { id: 26, word: "deteriorate", meaning: "恶化；变坏", options: ["改善；好转", "恶化；变坏", "维持；保持", "波动；变化"], difficulty: "hard" },
  { id: 27, word: "elaborate", meaning: "精心制作的；详尽的", options: ["简陋的；粗糙的", "精心制作的；详尽的", "基础的；初级的", "随意的；马虎的"], difficulty: "medium" },
  { id: 28, word: "fluctuate", meaning: "波动；起伏", options: ["稳定；不变", "波动；起伏", "上升；增长", "下降；减少"], difficulty: "hard" },
  { id: 29, word: "gratitude", meaning: "感激；感谢", options: ["怨恨；不满", "感激；感谢", "冷漠；无情", "嫉妒；羡慕"], difficulty: "easy" },
  { id: 30, word: "hierarchy", meaning: "等级制度；层次结构", options: ["平等制度", "等级制度；层次结构", "民主制度", "无序状态"], difficulty: "hard" },
];

export function getRandomQuestions(count: number = 20): Word[] {
  const shuffled = [...wordBank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export default wordBank;
