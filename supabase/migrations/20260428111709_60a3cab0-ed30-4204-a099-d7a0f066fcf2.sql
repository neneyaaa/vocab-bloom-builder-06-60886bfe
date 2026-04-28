-- 1. 角色枚举与表
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. 词汇库
CREATE TABLE public.words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  options JSONB NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  category TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_words_difficulty ON public.words(difficulty);
CREATE INDEX idx_words_enabled ON public.words(enabled);

ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read enabled words" ON public.words
  FOR SELECT TO authenticated
  USING (enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins insert words" ON public.words
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update words" ON public.words
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete words" ON public.words
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_words_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. 用户封禁表
CREATE TABLE public.user_bans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bans" ON public.user_bans
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users view own ban" ON public.user_bans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = _user_id)
$$;

-- 4. 让管理员可更新任何人资料（重置昵称/头像）
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- 5. 注册时默认授予 'user' 角色
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 6. 播种初始 30 个词汇
INSERT INTO public.words (word, meaning, options, difficulty, category) VALUES
('abandon','放弃；抛弃','["放弃；抛弃","吸收；吸引","完成；达到","积累；累积"]'::jsonb,'easy','core'),
('benefit','利益；好处','["限制；约束","利益；好处","负担；重担","障碍；阻碍"]'::jsonb,'easy','core'),
('challenge','挑战；质疑','["机会；机遇","变化；改变","挑战；质疑","平衡；均衡"]'::jsonb,'easy','core'),
('demonstrate','证明；展示','["怀疑；质疑","证明；展示","破坏；损害","隐藏；遮蔽"]'::jsonb,'easy','core'),
('essential','必要的；本质的','["多余的；额外的","偶然的；意外的","必要的；本质的","可选的；随意的"]'::jsonb,'easy','core'),
('facilitate','促进；使便利','["阻碍；妨碍","促进；使便利","复杂化","延迟；推迟"]'::jsonb,'medium','core'),
('genuine','真正的；真诚的','["虚假的；伪造的","普通的；一般的","真正的；真诚的","短暂的；临时的"]'::jsonb,'medium','core'),
('hypothesis','假说；假设','["结论；结果","假说；假设","证据；证明","定律；法则"]'::jsonb,'medium','core'),
('inevitable','不可避免的','["可预防的","不可避免的","难以置信的","可逆转的"]'::jsonb,'medium','core'),
('jurisdiction','司法权；管辖范围','["司法权；管辖范围","立法权；制定","行政权；执行","监督权；审查"]'::jsonb,'hard','core'),
('keen','热切的；敏锐的','["冷淡的；漠不关心的","热切的；敏锐的","愚钝的；迟钝的","犹豫的；不确定的"]'::jsonb,'easy','core'),
('legitimate','合法的；正当的','["非法的；违规的","模糊的；不确定的","合法的；正当的","临时的；暂时的"]'::jsonb,'medium','core'),
('manuscript','手稿；原稿','["印刷品；出版物","手稿；原稿","草图；草案","副本；复制品"]'::jsonb,'medium','core'),
('notorious','臭名昭著的','["默默无闻的","臭名昭著的","广受赞誉的","毫无争议的"]'::jsonb,'medium','core'),
('obsolete','过时的；废弃的','["过时的；废弃的","先进的；前沿的","流行的；时尚的","永恒的；持久的"]'::jsonb,'medium','core'),
('paradigm','范式；典范','["异常；反常","范式；典范","矛盾；冲突","偏差；偏离"]'::jsonb,'hard','core'),
('resilient','有弹性的；适应力强的','["脆弱的；易碎的","固执的；顽固的","有弹性的；适应力强的","被动的；消极的"]'::jsonb,'medium','core'),
('scrutinize','仔细审查；细查','["忽略；忽视","仔细审查；细查","简要浏览","随意处理"]'::jsonb,'hard','core'),
('tangible','有形的；切实的','["抽象的；模糊的","理论的；假设的","有形的；切实的","虚幻的；不真实的"]'::jsonb,'medium','core'),
('ubiquitous','无处不在的','["稀缺的；罕见的","无处不在的","独特的；唯一的","局部的；地区性的"]'::jsonb,'hard','core'),
('verbose','冗长的；啰嗦的','["简洁的；精炼的","冗长的；啰嗦的","沉默的；安静的","生动的；形象的"]'::jsonb,'hard','core'),
('withdraw','撤回；退出','["加入；参与","撤回；退出","投入；奉献","前进；推进"]'::jsonb,'easy','core'),
('yield','产出；屈服','["抵抗；反抗","消耗；浪费","产出；屈服","隐藏；掩盖"]'::jsonb,'easy','core'),
('ambiguous','模棱两可的','["明确的；清晰的","模棱两可的","简单的；直接的","精确的；准确的"]'::jsonb,'medium','core'),
('comprehensive','全面的；综合的','["片面的；局部的","全面的；综合的","简略的；概括的","深入的；详尽的"]'::jsonb,'medium','core'),
('deteriorate','恶化；变坏','["改善；好转","恶化；变坏","维持；保持","波动；变化"]'::jsonb,'hard','core'),
('elaborate','精心制作的；详尽的','["简陋的；粗糙的","精心制作的；详尽的","基础的；初级的","随意的；马虎的"]'::jsonb,'medium','core'),
('fluctuate','波动；起伏','["稳定；不变","波动；起伏","上升；增长","下降；减少"]'::jsonb,'hard','core'),
('gratitude','感激；感谢','["怨恨；不满","感激；感谢","冷漠；无情","嫉妒；羡慕"]'::jsonb,'easy','core'),
('hierarchy','等级制度；层次结构','["平等制度","等级制度；层次结构","民主制度","无序状态"]'::jsonb,'hard','core');