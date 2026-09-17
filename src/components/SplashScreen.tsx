import { BRAND } from '../constants/assets';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink-950">
      <img src={BRAND.heroBanner} alt="GPS DAS RIMAS" className="h-full w-full object-cover" />
    </div>
  );
}
