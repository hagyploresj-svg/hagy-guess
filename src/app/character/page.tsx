
function HumanCharacter({
  animation,
}: {
  animation: string;
}) {
  const group = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF(MODEL_URL);

  const { actions, names } = useAnimations(
    animations,
    group
  );

  useEffect(() => {
    const action = actions[animation];

    if (!action) {
      console.warn(
        'Animasyon bulunamadı:',
        animation,
        names
      );
      return;
    }

    action.reset();
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.fadeIn(0.2);
    action.play();

    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, animation, names]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
