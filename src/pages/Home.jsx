import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen theme-dark text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/40 bg-blue-600/20 text-sm font-black text-blue-200">
              LL
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white">LiteLab</div>
              <div className="text-sm font-semibold text-slate-300">用 AI 打造的輕量工具集合</div>
            </div>
          </div>
        </header>

        <main className="mt-16 grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              LiteLab Toolkit
            </div>
            <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">
              用 AI 打造的輕量工具集合
            </h1>
            <p className="max-w-xl text-base text-slate-300 md:text-lg">
              聚焦最常用的影像工作流程，快速進入工具、即時完成輸出。LiteLab 是你的輕量創作中控台。
            </p>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Cropper</h2>
                <p className="mt-2 text-sm text-slate-300">
                  批次裁切與輸出，保持一致尺寸與品質，快速完成整批圖片整理。
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                to="/cropper"
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                進入 Cropper
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Home;
