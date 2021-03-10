import { Router, NextFunction, Request, Response } from 'express';

const router: Router = Router();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    //res.render('index', { title: 'Express' });
    res.status(200).send("index!!\n");

  } catch (err) {
    next(err);
  }
});


export default router;
