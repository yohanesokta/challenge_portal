'use client';

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import NIMModal from "./NIMModal";

export default function NIMChecker() {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user && !(session.user as any).nim) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [session, status]);

  return (
    <NIMModal 
      isOpen={showModal} 
      onClose={() => setShowModal(false)} 
      isMandatory={true}
    />
  );
}
