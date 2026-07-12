import type { CareerPaths } from '../types';

interface CareerPathGraphProps {
  paths: CareerPaths;
}

/**
 * Renders the "career constellation": the user's profile connected to the
 * primary recommended path, branching into alternative directions.
 */
export const CareerPathGraph = ({ paths }: CareerPathGraphProps) => {
  if (!paths.primary) return null;

  return (
    <div className="mt-12 p-6 bg-slate-50/70 rounded-xl border border-slate-200/80">
      <h2 className="text-2xl font-semibold text-slate-700 mb-8 text-center">
        Your Career Constellation
      </h2>
      <div className="flex flex-col items-center text-center">
        <div className="px-6 py-3 bg-white rounded-lg shadow-md border border-slate-200">
          <p className="font-bold text-slate-800 text-lg">Your Profile</p>
        </div>

        <div className="w-1 h-8 bg-slate-300 my-2 rounded-full"></div>

        <div className="px-6 py-4 bg-indigo-600 text-white rounded-lg shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Primary Path
          </p>
          <p className="font-bold text-xl mt-1">{paths.primary}</p>
        </div>

        {paths.alternatives.length > 0 && (
          <>
            <div className="w-1 h-8 bg-slate-300 my-2 rounded-full"></div>
            <div className="w-1/2 h-1 bg-slate-300 rounded-full"></div>

            <div className="flex justify-center w-full gap-4 mt-2">
              {paths.alternatives.map((alternative) => (
                <div key={alternative} className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-1 h-8 bg-slate-300 rounded-full"></div>
                  <div className="px-4 py-3 bg-white rounded-lg shadow-md border border-slate-200 w-full">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Alternative
                    </p>
                    <p className="font-semibold text-slate-700 mt-1 truncate">{alternative}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
