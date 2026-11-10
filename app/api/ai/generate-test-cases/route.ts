import { createClient } from '@/utils/supabase/server';
import type { QuestionTestCase, StarterCode } from '@/types/database';

interface GeneratorRequest {
  title?: unknown;
  content?: unknown;
  expected_time_complexity?: unknown;
}

interface GeneratedQuestionData {
  test_cases: QuestionTestCase[];
  starter_code: StarterCode;
  hints: string[];
}

function starterCode(): StarterCode {
  return {
    typescript: 'function solution(input: unknown): unknown {\n  // TODO: implement\n}\n',
    javascript: 'function solution(input) {\n  // TODO: implement\n}\n',
    python: 'def solution(input_data):\n    # TODO: implement\n    pass\n',
  };
}

function fallbackFor(title: string, content: string): GeneratedQuestionData {
  const normalizedTitle = title.toLocaleLowerCase('vi');
  const sampleCases: Omit<QuestionTestCase, 'id'>[] = [];
  let hints: string[];

  if (normalizedTitle.includes('two sum') || normalizedTitle.includes('tìm cặp số')) {
    sampleCases.push(
      { input: '{"nums":[2,7,11,15],"target":9}', expected_output: '[0,1]', is_hidden: false },
      { input: '{"nums":[3,2,4],"target":6}', expected_output: '[1,2]', is_hidden: false },
      { input: '{"nums":[3,3],"target":6}', expected_output: '[0,1]', is_hidden: true },
      { input: '{"nums":[-1,-2,-3,-4,-5],"target":-8}', expected_output: '[2,4]', is_hidden: true },
      { input: '{"nums":[0,4,3,0],"target":0}', expected_output: '[0,3]', is_hidden: true },
    );
    hints = ['Lưu các giá trị đã duyệt cùng chỉ số của chúng.', 'Với mỗi số, tìm phần bù target - số hiện tại.', 'Đảm bảo không dùng cùng một phần tử hai lần.'];
  } else if (normalizedTitle.includes('valid parentheses') || normalizedTitle.includes('ngoặc')) {
    sampleCases.push(
      { input: '{"s":"()[]{}"}', expected_output: 'true', is_hidden: false },
      { input: '{"s":"([])"}', expected_output: 'true', is_hidden: false },
      { input: '{"s":""}', expected_output: 'true', is_hidden: true },
      { input: '{"s":"([)]"}', expected_output: 'false', is_hidden: true },
      { input: '{"s":"("}', expected_output: 'false', is_hidden: true },
    );
    hints = ['Dùng stack để nhớ loại ngoặc đang chờ đóng.', 'Khi gặp dấu đóng, so sánh với phần tử trên đỉnh stack.', 'Chuỗi hợp lệ khi stack rỗng sau khi duyệt hết.'];
  } else if (normalizedTitle.includes('lru cache') || normalizedTitle.includes('lru')) {
    sampleCases.push(
      { input: '{"capacity":2,"operations":[["put",1,1],["put",2,2],["get",1]]}', expected_output: '[null,null,1]', is_hidden: false },
      { input: '{"capacity":1,"operations":[["put",1,1],["put",2,2],["get",1],["get",2]]}', expected_output: '[null,null,-1,2]', is_hidden: false },
      { input: '{"capacity":0,"operations":[["put",1,1],["get",1]]}', expected_output: '[null,-1]', is_hidden: true },
      { input: '{"capacity":2,"operations":[["put",1,1],["put",1,10],["get",1]]}', expected_output: '[null,null,10]', is_hidden: true },
      { input: '{"capacity":2,"operations":[["put",1,1],["put",2,2],["get",1],["put",3,3],["get",2]]}', expected_output: '[null,null,1,null,-1]', is_hidden: true },
    );
    hints = ['Dùng map để tra cứu key trong O(1).', 'Kết hợp cấu trúc giữ thứ tự truy cập gần đây.', 'Khi vượt capacity, loại bỏ phần tử ít được dùng gần đây nhất.'];
  } else {
    const mentionsArray = /array|mảng|list|nums/i.test(`${title} ${content}`);
    const exampleInput = mentionsArray ? '{"input":[]}' : '{"input":"<điền dữ liệu mẫu>"}';
    sampleCases.push(
      { input: exampleInput, expected_output: 'TODO — xác nhận output theo đề bài', is_hidden: false, explanation: 'Ví dụ cơ bản; cần thay input/output theo định dạng đề bài.' },
      { input: mentionsArray ? '{"input":[1,2,3]}' : '{"input":"<điền trường hợp thường>"}', expected_output: 'TODO — xác nhận output theo đề bài', is_hidden: false, explanation: 'Trường hợp dữ liệu thông thường; cần kiểm tra lại.' },
      { input: mentionsArray ? '{"input":[]}' : '{"input":null}', expected_output: 'TODO — xác nhận output theo đề bài', is_hidden: true, explanation: 'Biên dữ liệu rỗng hoặc null; xác nhận đề bài định nghĩa thế nào.' },
      { input: mentionsArray ? '{"input":[-1,0,1]}' : '{"input":"<điền giá trị biên>"}', expected_output: 'TODO — xác nhận output theo đề bài', is_hidden: true, explanation: 'Biên âm/0 hoặc kích thước nhỏ; thay bằng trường hợp hợp lệ.' },
      { input: mentionsArray ? '{"input":[1,1,1,1]}' : '{"input":"<điền dữ liệu lớn/đặc biệt>"}', expected_output: 'TODO — xác nhận output theo đề bài', is_hidden: true, explanation: 'Dữ liệu trùng lặp hoặc kích thước lớn; cần xác nhận theo ràng buộc.' },
    );
    hints = [
      'Đọc kỹ định dạng đầu vào/đầu ra và các ràng buộc trước khi chọn cấu trúc dữ liệu.',
      'Xử lý riêng trường hợp rỗng, giá trị biên và dữ liệu trùng lặp nếu đề bài cho phép.',
      'So sánh độ phức tạp của lời giải với mục tiêu đã khai báo.',
    ];
  }

  return {
    test_cases: sampleCases.map((testCase, index) => ({ id: `draft-${index + 1}`, ...testCase })),
    starter_code: starterCode(),
    hints,
  };
}

function normalizeGenerated(value: unknown): GeneratedQuestionData | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.test_cases) || !Array.isArray(record.hints)) return null;
  if (typeof record.starter_code !== 'object' || record.starter_code === null) return null;

  if (record.test_cases.some((item) => !item || typeof item !== 'object')) return null;
  const testCases = record.test_cases as Partial<QuestionTestCase>[];
  if (
    testCases.length !== 5 ||
    testCases.filter((item) => item.is_hidden === false).length !== 2 ||
    testCases.filter((item) => item.is_hidden === true).length !== 3
  ) return null;

  if (testCases.some((item) => typeof item.input !== 'string' || typeof item.expected_output !== 'string')) return null;
  const rawStarter = record.starter_code as Record<string, unknown>;
  if (!['typescript', 'javascript', 'python'].every((key) => typeof rawStarter[key] === 'string')) return null;

  return {
    test_cases: testCases.map((item, index) => ({
      id: `generated-${index + 1}`,
      input: item.input!,
      expected_output: item.expected_output!,
      is_hidden: item.is_hidden === true,
      explanation: typeof item.explanation === 'string' ? item.explanation : undefined,
    })),
    starter_code: rawStarter as unknown as StarterCode,
    hints: record.hints.filter((hint): hint is string => typeof hint === 'string').slice(0, 20),
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ADMIN') return Response.json({ error: 'Chỉ Admin được tạo gợi ý.' }, { status: 403 });

  let body: GeneratorRequest;
  try {
    body = await request.json() as GeneratorRequest;
  } catch {
    return Response.json({ error: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });
  }
  if (
    !body || typeof body !== 'object' ||
    typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.length > 200 ||
    typeof body.content !== 'string' || body.content.trim().length < 10 || body.content.length > 15000 ||
    (body.expected_time_complexity !== undefined && typeof body.expected_time_complexity !== 'string')
  ) return Response.json({ error: 'Nhập tiêu đề và nội dung đề bài trước (tối đa 15.000 ký tự).' }, { status: 400 });

  const fallback = fallbackFor(body.title, body.content);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({
      ...fallback,
      mode: 'fallback',
      warning: 'Chưa cấu hình OPENAI_API_KEY. Đây là gợi ý mẫu theo nhận diện tiêu đề; hãy rà soát mọi input/output. Với bài chưa nhận diện, output TODO phải được thay trước khi lưu.',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Create interview coding exercise drafts. Return JSON with exactly 5 test_cases: first exactly 2 public (is_hidden false), then exactly 3 hidden (true). Each has id,input,expected_output,is_hidden,explanation. Also return starter_code with typescript,javascript,python strings and hints string array. Inputs and outputs must follow the stated problem format. Never invent guarantees absent from the prompt. If ambiguous, put a clear TODO in expected_output and explanation. Starter code must not include a solution.',
          },
          {
            role: 'user',
            content: JSON.stringify({ title: body.title, content: body.content, expected_time_complexity: body.expected_time_complexity }),
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`LLM returned ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const message = payload.choices?.[0]?.message?.content;
    const generated = message ? normalizeGenerated(JSON.parse(message) as unknown) : null;
    if (!generated) throw new Error('LLM response did not match the requested schema');
    return Response.json({ ...generated, mode: 'ai' });
  } catch {
    return Response.json({
      ...fallback,
      mode: 'fallback',
      warning: 'AI không phản hồi hoặc trả dữ liệu sai cấu trúc. Đã điền bộ gợi ý dự phòng; hãy rà soát input/output trước khi lưu.',
    });
  }
}
