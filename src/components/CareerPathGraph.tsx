import React from 'react';
import type { CareerPaths } from '../types';

interface CareerPathGraphProps {
  paths: CareerPaths;
}

/**
 * Renders the "career constellation": the user's profile connected to the
 * primary recommended path, branching into alternative directions.
 */
export const CareerPathGraph: React.FC<CareerPathGraphProps> = ({ paths }) => {
  if (!paths.primary) {
    return null;
  }

  // Decoupled Tailwind layout classes for maximum cleanliness
  const containerWrapperStyles = "mt-12 p-6 bg-slate-50/70 rounded-xl border border-slate-200/80";
  const profileCardStyles = "px-6 py-3 bg-white rounded-lg shadow-md border border-slate-200";
  const primaryPathCardStyles = "px-6 py-4 bg-indigo-600 text-white rounded-lg shadow-lg";
  const verticalConnectorStyles = "w-1 h-8 bg-slate-300 my-2 rounded-full";
  const branchConnectorStyles = "w-1 h-8 bg-slate-300 rounded-full";

  const hasAlternativePaths = paths.alternatives.length > 0;

  return (
    <div className={containerWrapperStyles}>
      <h2 className="text-2xl font-semibold text-slate-700 mb-8 text-center">
        Your Career Constellation
      </h2>
      
      <div className="flex flex-col items-center text-center">
        {/* Core Profile Node */}
        <div className={profileCardStyles}>
          <p className="font-bold text-slate-800 text-lg">Your Profile</p>
        </div>

        <div className={verticalConnectorStyles} />

        {/* Primary Recommended Route */}
        <div className={primaryPathCardStyles}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Primary Path
          </p>
          <p className="font-bold text-xl mt-1">{paths.primary}</p>
        </div>

        {/* Alternative Branches */}
        {hasAlternativePaths && (
          <>
            <div className={verticalConnectorStyles} />
            <div className="w-1/2 h-1 bg-slate-300 rounded-full" />

            <div className="flex justify-center w-full gap-4 mt-2">
              {paths.alternatives.map((alternative) => {
                return (
                  <div key={alternative} className="flex flex-col items-center flex-1 min-w-0">
                    <div className={branchConnectorStyles} />
                    <div className="px-4 py-3 bg-white rounded-lg shadow-md border border-slate-200 w-full">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Alternative
                      </p>
                      <p className="font-semibold text-slate-700 mt-1 truncate">
                        {alternative}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
