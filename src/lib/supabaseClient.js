import { createClient } from '@supabase/supabase-js';

// Vite는 .env 파일에서 VITE_ 로 시작하는 값만 브라우저 코드에 넘겨줍니다.
// 키를 코드에 직접 적지 않고 환경변수로 분리해야 깃허브에 키가 노출되지 않습니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 키가 비어 있으면 어디가 문제인지 바로 알 수 있도록 명확한 에러를 던집니다.
// (그냥 두면 나중에 "Invalid URL" 같은 알아보기 힘든 에러가 납니다)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 .env에 설정되지 않았습니다.');
}

// 앱 전체에서 이 하나의 supabase 객체를 import 해서 재사용합니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
