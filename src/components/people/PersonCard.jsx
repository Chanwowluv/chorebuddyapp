import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Link as LinkIcon, Unlink, CheckCircle, UserPlus } from "lucide-react";
import { AVATAR_COLORS } from '@/components/lib/constants';

function PersonCard({ person, completedChores, currentChores, onEdit, onDelete, onLinkAccount, onUnlinkAccount, canManageLinks }) {
  return (
    <div className={`funky-card-hover funky-card p-6 border-4 relative group ${AVATAR_COLORS[person.avatar_color]}`}>
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {!person.linked_user_id && onLinkAccount && canManageLinks &&
        <Button size="icon" variant="ghost" onClick={() => onLinkAccount(person)} className="h-8 w-8 rounded-full hover:bg-black/10 focus:ring-2 focus:ring-green-500 focus:ring-offset-2" title="Link account" aria-label={`Link account for ${person.name}`}>
            <UserPlus className="w-4 h-4 text-green-600" />
          </Button>
        }
        {person.linked_user_id && onUnlinkAccount && canManageLinks &&
        <Button size="icon" variant="ghost" onClick={() => onUnlinkAccount(person)} className="h-8 w-8 rounded-full hover:bg-black/10 focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2" title="Unlink account" aria-label={`Unlink account for ${person.name}`}>
            <Unlink className="w-4 h-4 text-[#FF6B35]" />
          </Button>
        }
        <Button size="icon" variant="ghost" onClick={() => onEdit(person)} className="h-8 w-8 rounded-full hover:bg-black/10 focus:ring-2 focus:ring-[#5E3B85] focus:ring-offset-2" aria-label={`Edit ${person.name}`}>
          <Edit className="w-4 h-4 text-[#5E3B85]" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(person)} className="h-8 w-8 rounded-full hover:bg-black/10 focus:ring-2 focus:ring-red-500 focus:ring-offset-2" aria-label={`Delete ${person.name}`}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex-shrink-0 relative">
          <div className="bg-violet-300 text-white rounded-full funky-button w-24 h-24 border-4 border-[#5E3B85] flex items-center justify-center border-[#9b7ec9]">
            <span className="text-4xl header-font">{person.name.charAt(0).toUpperCase()}</span>
          </div>
          {person.linked_user_id &&
          <div className="absolute -bottom-1 -right-1 funky-button w-8 h-8 bg-green-500 border-2 border-white rounded-full flex items-center justify-center" title="Account linked">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          }
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="funky-button text-xs px-3 py-1 bg-white border-2 border-[#5E3B85] body-font text-[#5E3B85] capitalize">{person.role}</span>
            {person.linked_user_id &&
            <span className="funky-button text-xs px-3 py-1 bg-green-100 border-2 border-green-500 body-font text-green-700 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Linked
              </span>
            }
          </div>
          <h3 className="header-font text-3xl text-[#2B59C3] mt-1">{person.name}</h3>
          <div className="flex items-center gap-6 mt-3">
            <div className="text-center">
              <p className="header-font text-2xl text-green-600">{completedChores}</p>
              <p className="body-font-light text-sm text-gray-600">Done</p>
            </div>
            <div className="text-center">
              <p className="header-font text-2xl text-[#FF6B35]">{currentChores}</p>
              <p className="body-font-light text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>);

}

export default React.memo(PersonCard, (prev, next) => {
  return prev.person.id === next.person.id &&
  prev.completedChores === next.completedChores &&
  prev.currentChores === next.currentChores &&
  prev.person.linked_user_id === next.person.linked_user_id &&
  prev.onUnlinkAccount === next.onUnlinkAccount;
});