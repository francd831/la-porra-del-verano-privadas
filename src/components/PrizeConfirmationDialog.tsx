import { Gift, ExternalLink, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrizeConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export default function PrizeConfirmationDialog({
  isOpen,
  onClose,
  onAccept,
  onDecline,
}: PrizeConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gold to-gold/60 rounded-full flex items-center justify-center mb-4 shadow-glow">
            <Gift className="w-8 h-8 text-gold-foreground" />
          </div>
          <DialogTitle className="text-center text-xl">
            ¡Pronósticos guardados correctamente!
          </DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <p>
              Tus pronósticos se han guardado exitosamente.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg mt-4">
              <p className="font-semibold text-foreground">
                ¿Te gustaría participar por los premios?
              </p>
              <p className="text-sm mt-2">
                Por solo <span className="font-bold text-primary">5 €</span> podrás optar a los premios del concurso.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onDecline}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            No, gracias
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 bg-gradient-to-r from-gold to-gold/80 text-gold-foreground hover:opacity-90"
          >
            <Gift className="w-4 h-4 mr-2" />
            Sí, acceder (5 €)
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
