import React from 'react';
import { TeamMember } from '../types';

interface TeamCardProps {
  member: TeamMember;
}

const TeamCard: React.FC<TeamCardProps> = ({ member }) => {
  return (
    <div className="bg-asme-red rounded-xl p-6 flex flex-col shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
      <div className="text-white font-jost font-semibold text-lg mb-4">
        {member.name}, {member.position}
      </div>
      <div className="flex flex-row gap-6">
        <div className="w-32 h-32 flex-shrink-0 bg-white rounded-lg overflow-hidden">
            <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col text-xs text-white space-y-2 font-jost">
          <p><span className="underline decoration-white/50 underline-offset-2">Year</span>: {member.year}</p>
          <p><span className="underline decoration-white/50 underline-offset-2">Major</span>: {member.major}</p>
          {member.email && (
            <p>
              <span className="underline decoration-white/50 underline-offset-2">Email</span>:{' '}
              <a href={`mailto:${member.email}`} className="text-white hover:underline opacity-90 hover:opacity-100">
                {member.email}
              </a>
            </p>
          )}
          {member.isExec && member.hometown && (
             <p><span className="underline decoration-white/50 underline-offset-2">Hometown</span>: {member.hometown}</p>
          )}
          {member.funFact && (
             <p className="mt-2"><span className="underline decoration-white/50 underline-offset-2">Fun Fact</span>: <span className="italic opacity-90">"{member.funFact}"</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamCard;