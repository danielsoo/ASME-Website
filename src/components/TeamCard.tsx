import React from 'react';
import { TeamMember } from '../types';
import { GripVertical } from 'lucide-react';

interface TeamCardProps {
  member: TeamMember;
  showDragHandle?: boolean;
  onDragHandleMouseDown?: (e: React.MouseEvent) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ member, showDragHandle, onDragHandleMouseDown }) => {
  const focusX = typeof member.imageFocusX === 'number' ? member.imageFocusX : 50;
  const focusY = typeof member.imageFocusY === 'number' ? member.imageFocusY : 50;
  const zoom = typeof member.imageZoom === 'number' && member.imageZoom >= 1 ? member.imageZoom : 1;

  return (
    <div className="bg-asme-red rounded-xl p-6 flex flex-col shadow-lg transform hover:scale-[1.02] transition-transform duration-300 relative">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="text-white font-jost font-semibold text-lg overflow-hidden text-ellipsis whitespace-nowrap flex-1">
          {member.name}, {member.position}
        </div>
        {showDragHandle && (
          <div
            onMouseDown={onDragHandleMouseDown}
            className="cursor-move hover:opacity-70 transition-opacity flex-shrink-0"
            title="Drag to reorder"
          >
            <GripVertical size={20} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex flex-row gap-6 items-center">
        <div className="w-28 sm:w-32 aspect-square flex-shrink-0 bg-white rounded-lg overflow-hidden ring-1 ring-white/40">
            <img
              src={member.imageUrl}
              alt={member.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: `${focusX}% ${focusY}%`, transform: `scale(${zoom})`, transformOrigin: 'center' }}
            />
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
             <p><span className="underline decoration-white/50 underline-offset-2">Fun Fact</span>: <span className="italic opacity-90">"{member.funFact}"</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamCard;